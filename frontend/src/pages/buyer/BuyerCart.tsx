import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatINR } from '../../lib/format'
import { loadRazorpayScript } from '../../lib/razorpay'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

import { localOrdersRef, localListingsRef } from '../../lib/localDb'

type OrderRow = {
  id: string
  quantity_kg: number
  total_amount: number
  status: string
  payment_status: string
  delivery_address: string | null
  listing_id: string
  farmer_id: string
  payment_method?: string
}

type PaymentMethod = 'razorpay' | 'cod'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

export function BuyerCart() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const user = useAuthStore((s) => s.user)
  const isLocal = useAuthStore((s) => s.isLocal)

  const [order, setOrder] = useState<OrderRow | null>(null)
  const [produceName, setProduceName] = useState('')
  const [farmerName, setFarmerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('cod')
  const [successMethod, setSuccessMethod] = useState<PaymentMethod>('cod')

  const load = useCallback(async () => {
    if (!orderId || !user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)

    // ── Local mode ────────────────────────────────────────────────
    if (isLocal || !isSupabaseConfigured()) {
      const localOrder = localOrdersRef[orderId]
      if (!localOrder) {
        setError('Order not found')
        setOrder(null)
        setLoading(false)
        return
      }
      const listing = localListingsRef[localOrder.listing_id]
      setProduceName(listing?.produce_name ?? 'Produce')
      setFarmerName(listing?.farmer_name ?? 'Farmer')
      setOrder(localOrder as OrderRow)
      if (localOrder.payment_status === 'paid') {
        setPaymentSuccess(true)
        setSuccessMethod(localOrder.payment_method ?? 'razorpay')
      }
      setError(null)
      setLoading(false)
      return
    }

    // ── Supabase mode ─────────────────────────────────────────────
    const { data, error: e } = await supabase
      .from('orders')
      .select('id, quantity_kg, total_amount, status, payment_status, delivery_address, listing_id, farmer_id')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .maybeSingle()
    if (e || !data) {
      setError(e?.message ?? 'Order not found')
      setOrder(null)
      setLoading(false)
      return
    }
    const { data: listing } = await supabase.from('listings').select('produce_name').eq('id', data.listing_id).maybeSingle()
    const { data: farmer } = await supabase.from('profiles').select('name').eq('id', data.farmer_id).maybeSingle()
    setProduceName(listing?.produce_name ?? 'Produce')
    setFarmerName(farmer?.name ?? 'Farmer')
    setOrder(data as OrderRow)
    if (data.payment_status === 'paid') {
      setPaymentSuccess(true)
    }
    setError(null)
    setLoading(false)
  }, [orderId, user?.id, isLocal])

  useEffect(() => {
    void load()
  }, [load])

  // ── Cash on Delivery ────────────────────────────────────────────
  async function handleCOD() {
    if (!order || !user) {
      setError('Missing order or sign-in.')
      return
    }
    setPaying(true)
    setError(null)
    try {
      if (isLocal || !isSupabaseConfigured()) {
        if (localOrdersRef[order.id]) {
          localOrdersRef[order.id].payment_status = 'paid'
          localOrdersRef[order.id].payment_method = 'cod'
        }
      } else {
        const { error: ue } = await supabase
          .from('orders')
          .update({ payment_status: 'paid' })
          .eq('id', order.id)
          .eq('buyer_id', user.id)
        if (ue) throw new Error(ue.message)
      }
      setSuccessMethod('cod')
      setPaymentSuccess(true)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not confirm order')
    } finally {
      setPaying(false)
    }
  }

  // ── Razorpay Payment ────────────────────────────────────────────
  async function handleRazorpay() {
    if (!order || !user) {
      setError('Missing order or sign-in.')
      return
    }
    const amountPaise = Math.max(100, Math.round(Number(order.total_amount) * 100))
    setPaying(true)
    setError(null)
    try {
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined
      
      // Simulate checkout in local/demo mode when keys are placeholders
      if (!keyId || keyId === 'rzp_test_xxxx') {
        if (isLocal || !isSupabaseConfigured()) {
          await new Promise((resolve) => setTimeout(resolve, 1500))
          if (localOrdersRef[order.id]) {
            localOrdersRef[order.id].payment_status = 'paid'
            localOrdersRef[order.id].payment_method = 'razorpay'
            localOrdersRef[order.id].razorpay_payment_id = 'pay_simulated_' + Math.random().toString(36).slice(2, 10)
          }
          setPaymentId('pay_simulated_' + Math.random().toString(36).slice(2, 10))
          setSuccessMethod('razorpay')
          setPaymentSuccess(true)
          await load()
          setPaying(false)
          return
        }
        
        setError('Razorpay test keys not configured. Please use Cash on Delivery, or set valid keys in frontend/.env and backend/.env')
        setPaying(false)
        return
      }

      await loadRazorpayScript()
      const createRes = await fetch(`${BACKEND_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaise, receipt: order.id.slice(0, 40) }),
      })
      const createJson = (await createRes.json()) as { orderId?: string; keyId?: string; error?: string }
      if (!createRes.ok) {
        throw new Error(createJson.error ?? 'Could not create Razorpay order. Check backend Razorpay keys.')
      }

      const rzOrderId = createJson.orderId
      if (!rzOrderId || !window.Razorpay) throw new Error('Razorpay init failed')

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: createJson.keyId ?? keyId,
          amount: amountPaise,
          currency: 'INR',
          name: 'FarmNexus Tech',
          description: produceName,
          order_id: rzOrderId,
          handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            try {
              const verifyRes = await fetch(`${BACKEND_URL}/api/payments/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              })
              if (!verifyRes.ok) throw new Error('Payment verification failed')

              if (isLocal || !isSupabaseConfigured()) {
                if (localOrdersRef[order.id]) {
                  localOrdersRef[order.id].payment_status = 'paid'
                  localOrdersRef[order.id].payment_method = 'razorpay'
                  localOrdersRef[order.id].razorpay_payment_id = response.razorpay_payment_id
                }
              } else {
                const { error: ue } = await supabase
                  .from('orders')
                  .update({
                    payment_status: 'paid',
                    razorpay_payment_id: response.razorpay_payment_id,
                  })
                  .eq('id', order.id)
                  .eq('buyer_id', user.id)
                if (ue) throw new Error(ue.message)
              }

              setPaymentId(response.razorpay_payment_id)
              resolve()
            } catch (err) {
              reject(err instanceof Error ? err : new Error('Verify failed'))
            }
          },
          prefill: {
            name: user.user_metadata?.name ?? user.phone ?? '',
            contact: user.phone ?? '',
          },
          theme: { color: '#2E7D32' },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        })
        rzp.open()
      })

      setSuccessMethod('razorpay')
      setPaymentSuccess(true)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Payment error'
      if (msg !== 'Payment cancelled') setError(msg)
    } finally {
      setPaying(false)
    }
  }

  function handlePay() {
    if (method === 'cod') {
      void handleCOD()
    } else {
      void handleRazorpay()
    }
  }

  // ── No order selected ───────────────────────────────────────────
  if (!orderId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Checkout</h1>
          <p className="mt-2 text-neutral-500">No order selected. Browse produce and place an order first.</p>
          <Link to="/buyer/home" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2E7D32] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg">
            Browse Produce
          </Link>
        </div>
      </main>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm text-neutral-500">Loading order…</p>
        </div>
      </main>
    )
  }

  // ── Order not found ─────────────────────────────────────────────
  if (!order) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <Link to="/buyer/orders" className="mt-4 text-sm text-[#2E7D32] font-medium hover:underline">
            ← My orders
          </Link>
        </div>
      </main>
    )
  }

  const paid = order.payment_status === 'paid'

  // ── Payment success celebration ─────────────────────────────────
  if (paymentSuccess || paid) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="animate-fade-in-up rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50 via-white to-white p-8 shadow-xl">
          {/* Success icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-20" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <h1 className="mt-6 text-center text-3xl font-extrabold text-emerald-800">
            {successMethod === 'cod' ? 'Order Confirmed!' : 'Payment Successful!'}
          </h1>
          <p className="mt-2 text-center text-neutral-500">
            {successMethod === 'cod'
              ? 'Your order has been placed. Pay with cash when your order is delivered.'
              : 'Your payment has been processed securely via Razorpay.'}
          </p>

          {/* Order summary */}
          <div className="mt-8 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-neutral-500">Product</span>
              <span className="font-semibold text-neutral-900">{produceName}</span>
            </div>
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-neutral-500">Quantity</span>
              <span className="font-semibold text-neutral-900">{order.quantity_kg} kg</span>
            </div>
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-neutral-500">Delivery</span>
              <span className="max-w-[55%] text-right font-medium text-neutral-800">{order.delivery_address}</span>
            </div>
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-neutral-500">Farmer</span>
              <span className="font-semibold text-neutral-900">{farmerName}</span>
            </div>
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-neutral-500">Payment Method</span>
              <span className="font-semibold text-neutral-900">
                {successMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Razorpay'}
              </span>
            </div>
            <div className="flex justify-between px-5 py-4 bg-emerald-50/50">
              <span className="font-bold text-neutral-700">
                {successMethod === 'cod' ? 'Amount Due' : 'Total Paid'}
              </span>
              <span className="text-xl font-extrabold text-emerald-700">{formatINR(Number(order.total_amount))}</span>
            </div>
          </div>

          {/* Payment badge */}
          <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-800">
              {successMethod === 'cod'
                ? 'Order confirmed — pay on delivery'
                : <>Payment verified{paymentId && <span className="ml-1 font-normal text-emerald-600"> · {paymentId.slice(0, 18)}…</span>}</>
              }
            </span>
          </div>

          <p className="mt-5 text-center text-sm text-neutral-500">
            The farmer will confirm your order shortly and coordinate delivery.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link to="/buyer/orders" className="rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
              View Orders
            </Link>
            <Link to="/buyer/home" className="rounded-lg bg-[#2E7D32] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ── Checkout — Pending Payment ──────────────────────────────────
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/buyer/orders" className="inline-flex items-center gap-1 text-sm font-medium text-[#2E7D32] hover:underline mb-6">
        ← Back to orders
      </Link>

      <div className="animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Checkout</h1>
            <p className="text-sm text-neutral-500">Order #{order.id.slice(0, 8)}</p>
          </div>
        </div>

        {/* Order card */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-lg overflow-hidden">
          {/* Product section */}
          <div className="bg-gradient-to-r from-emerald-50 to-white px-6 py-5 border-b border-neutral-100">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">Order Summary</p>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-emerald-100 shadow-sm">
                <span className="text-2xl">🌾</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-neutral-900 text-lg">{produceName}</p>
                <p className="text-sm text-neutral-500">{farmerName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500">{order.quantity_kg} kg</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="divide-y divide-neutral-100 px-6">
            <div className="flex justify-between py-3.5 text-sm">
              <span className="text-neutral-500">Delivery Address</span>
              <span className="max-w-[55%] text-right font-medium text-neutral-800">{order.delivery_address || '—'}</span>
            </div>
            <div className="flex justify-between py-3.5 text-sm">
              <span className="text-neutral-500">Order Status</span>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-blue-700">{order.status}</span>
            </div>
          </div>

          {/* Total */}
          <div className="mx-6 mt-2 mb-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-5 py-4">
            <span className="font-bold text-neutral-700">Total Amount</span>
            <span className="text-2xl font-extrabold text-emerald-700">{formatINR(Number(order.total_amount))}</span>
          </div>

          {/* ── Payment Method Selection ──────────────────────────── */}
          <div className="px-6 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Choose Payment Method</p>
            <div className="space-y-2.5">
              {/* Cash on Delivery */}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition-all ${
                  method === 'cod'
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-sm shadow-emerald-100'
                    : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={method === 'cod'}
                  onChange={() => { setMethod('cod'); setError(null) }}
                  className="sr-only"
                />
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                  method === 'cod' ? 'border-emerald-500' : 'border-neutral-300'
                }`}>
                  {method === 'cod' && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 border border-amber-100">
                  <span className="text-xl">💵</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900 text-sm">Cash on Delivery</p>
                  <p className="text-xs text-neutral-500">Pay when your order arrives</p>
                </div>
                {method === 'cod' && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">SELECTED</span>
                )}
              </label>

              {/* Razorpay */}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition-all ${
                  method === 'razorpay'
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-sm shadow-emerald-100'
                    : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  checked={method === 'razorpay'}
                  onChange={() => { setMethod('razorpay'); setError(null) }}
                  className="sr-only"
                />
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                  method === 'razorpay' ? 'border-emerald-500' : 'border-neutral-300'
                }`}>
                  {method === 'razorpay' && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-xl">💳</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900 text-sm">Razorpay</p>
                  <p className="text-xs text-neutral-500">UPI, Cards, Net Banking, Wallets</p>
                </div>
                {method === 'razorpay' && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">SELECTED</span>
                )}
              </label>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Pay / Confirm button */}
          <div className="px-6 pb-6">
            <button
              id="pay-btn"
              type="button"
              disabled={paying}
              onClick={handlePay}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#2E7D32] to-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:shadow-xl hover:shadow-emerald-300 disabled:opacity-60 active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {paying ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    {method === 'cod' ? 'Confirming Order…' : 'Opening Razorpay…'}
                  </>
                ) : method === 'cod' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Order — Cash on Delivery
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Pay {formatINR(Number(order.total_amount))} via Razorpay
                  </>
                )}
              </span>
              {/* Shimmer effect */}
              {!paying && (
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
              )}
            </button>

            {/* Security note */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {method === 'cod' ? 'No payment required now — pay on delivery' : 'Secured by Razorpay · 256-bit SSL encryption'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <Link to="/buyer/orders" className="text-neutral-500 hover:text-neutral-700 transition">
            My Orders
          </Link>
          <span className="text-neutral-300">·</span>
          <Link to="/buyer/home" className="text-neutral-500 hover:text-neutral-700 transition">
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  )
}
