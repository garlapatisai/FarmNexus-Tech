import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatINR } from '../../lib/format'
import { loadRazorpayScript } from '../../lib/razorpay'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

type OrderRow = {
  id: string
  quantity_kg: number
  total_amount: number
  status: string
  payment_status: string
  delivery_address: string | null
  listing_id: string
  farmer_id: string
}

export function BuyerCart() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const user = useAuthStore((s) => s.user)

  const [order, setOrder] = useState<OrderRow | null>(null)
  const [produceName, setProduceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    if (!orderId || !user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
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
    setProduceName(listing?.produce_name ?? 'Produce')
    setOrder(data as OrderRow)
    setError(null)
    setLoading(false)
  }, [orderId, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function payUPI() {
    if (!order || !user) {
      setError('Missing order or sign-in.')
      return
    }
    const amountPaise = Math.max(100, Math.round(Number(order.total_amount) * 100))
    setPaying(true)
    setError(null)
    try {
      await loadRazorpayScript()
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined
      if (!keyId) {
        setError('Set VITE_RAZORPAY_KEY_ID in frontend/.env (same as Razorpay Key Id).')
        setPaying(false)
        return
      }

      const createRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaise, receipt: order.id }),
      })
      const createJson = (await createRes.json()) as { orderId?: string; keyId?: string; error?: string }
      if (!createRes.ok) {
        throw new Error(createJson.error ?? 'Could not create Razorpay order (configure backend keys).')
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
              const verifyRes = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              })
              if (!verifyRes.ok) throw new Error('Payment verification failed')
              const { error: ue } = await supabase
                .from('orders')
                .update({
                  payment_status: 'paid',
                  razorpay_payment_id: response.razorpay_payment_id,
                })
                .eq('id', order.id)
                .eq('buyer_id', user.id)
              if (ue) throw new Error(ue.message)
              resolve()
            } catch (err) {
              reject(err instanceof Error ? err : new Error('Verify failed'))
            }
          },
          prefill: {
            name: user.user_metadata?.name ?? user.phone ?? '',
            contact: user.phone ?? '',
          },
          theme: { color: '#1b6b3a' },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        })
        rzp.open()
      })

      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment error')
    } finally {
      setPaying(false)
    }
  }

  if (!orderId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-xl font-bold">Checkout</h1>
        <p className="mt-2 text-neutral-600">No order selected. Browse produce and place an order first.</p>
        <Link to="/buyer/home" className="mt-4 inline-block text-primary underline">
          Browse
        </Link>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-neutral-600">Loading order…</p>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-red-600">{error}</p>
        <Link to="/buyer/orders" className="mt-4 inline-block text-primary underline">
          My orders
        </Link>
      </main>
    )
  }

  const paid = order.payment_status === 'paid'

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Checkout</h1>
      <p className="text-sm text-neutral-600">Order #{order.id.slice(0, 8)}</p>

      <div className="mt-8 space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600">{produceName}</span>
          <span className="font-medium">{order.quantity_kg} kg</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600">Delivery</span>
          <span className="max-w-[60%] text-right text-neutral-800">{order.delivery_address}</span>
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatINR(Number(order.total_amount))}</span>
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Status: <span className="font-medium capitalize">{order.status}</span> · Payment:{' '}
          <span className="font-medium">{order.payment_status}</span>
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {paid ? (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Payment received. The farmer will confirm the order.</div>
        ) : (
          <button
            type="button"
            disabled={paying}
            onClick={() => void payUPI()}
            className="w-full rounded-lg bg-accent py-3 font-semibold text-white disabled:opacity-50"
          >
            {paying ? 'Opening Razorpay…' : 'Pay via UPI (Razorpay)'}
          </button>
        )}

        <div className="flex gap-4 text-sm">
          <Link to="/buyer/orders" className="text-primary underline">
            My orders
          </Link>
          <Link to="/buyer/home" className="text-primary underline">
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  )
}
