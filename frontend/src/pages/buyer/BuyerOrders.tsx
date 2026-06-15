import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatINR } from '../../lib/format'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localOrdersRef: Record<string, any> = (window as any).__farmnexusLocalOrders ??
  ((window as any).__farmnexusLocalOrders = {})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localListingsRef: Record<string, any> = (window as any).__farmnexusLocalListings ??
  ((window as any).__farmnexusLocalListings = {})

type OrderRow = {
  id: string
  listing_id: string
  farmer_id: string
  quantity_kg: number
  total_amount: number
  status: string
  payment_status: string
  delivery_address: string | null
  produce_name?: string
  farmer_name?: string
}

export function BuyerOrders() {
  const user = useAuthStore((s) => s.user)
  const isLocal = useAuthStore((s) => s.isLocal)
  const [searchParams] = useSearchParams()
  const localOrderSuccess = searchParams.get('localOrder') === '1'
  const [rows, setRows] = useState<OrderRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    if (isLocal || !isSupabaseConfigured()) {
      const orders = Object.values(localOrdersRef)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setRows(
        orders.map((o) => {
          const l = localListingsRef[o.listing_id]
          return {
            ...o,
            produce_name: l?.produce_name || 'Local Produce',
            farmer_name: l?.farmer_name || 'Local Farmer',
          }
        }) as OrderRow[]
      )
      setError(null)
      setLoading(false)
      return
    }

    const { data: orders, error: oe } = await supabase
      .from('orders')
      .select('id, listing_id, farmer_id, quantity_kg, total_amount, status, payment_status, delivery_address')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })

    if (oe) {
      setError(oe.message)
      setRows([])
      setLoading(false)
      return
    }

    const listingIds = [...new Set((orders ?? []).map((o) => o.listing_id))]
    const farmerIds = [...new Set((orders ?? []).map((o) => o.farmer_id))]

    let lmap: Record<string, string> = {}
    if (listingIds.length) {
      const { data: listings } = await supabase.from('listings').select('id, produce_name').in('id', listingIds)
      lmap = Object.fromEntries((listings ?? []).map((l) => [l.id, l.produce_name]))
    }
    let fmap: Record<string, string> = {}
    if (farmerIds.length) {
      const { data: farmers } = await supabase.from('profiles').select('id, name').in('id', farmerIds)
      fmap = Object.fromEntries((farmers ?? []).map((f) => [f.id, f.name ?? 'Farmer']))
    }

    setRows(
      (orders ?? []).map((o) => ({
        ...o,
        produce_name: lmap[o.listing_id],
        farmer_name: fmap[o.farmer_id],
      })) as OrderRow[],
    )
    setError(null)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function markDelivered(id: string) {
    if (isLocal || !isSupabaseConfigured()) {
      if (localOrdersRef[id]) {
        localOrdersRef[id].status = 'delivered'
      }
      void load()
      return
    }

    const { error: e } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', id).eq('buyer_id', user?.id ?? '')
    if (e) {
      alert(e.message)
      return
    }
    void load()
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">My orders</h1>
      <p className="text-sm text-neutral-600">Track status: placed → accepted → dispatched → delivered.</p>

      {localOrderSuccess && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-emerald-900">Order placed successfully!</p>
            <p className="text-sm text-emerald-700">The farmer will confirm your order shortly. <Link to="/buyer/home" className="underline font-medium">Continue shopping</Link></p>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-neutral-600">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {/* Shopping bag illustration */}
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-800">No orders yet</h2>
            <p className="mt-2 max-w-sm text-neutral-500">
              Your orders will appear here once you place one.
            </p>
            <Link
              to="/buyer/home"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Browse Produce
            </Link>
          </div>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2">Produce</th>
                <th className="px-3 py-2">Farmer</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100">
                  <td className="px-3 py-2 font-medium">{o.produce_name}</td>
                  <td className="px-3 py-2">{o.farmer_name}</td>
                  <td className="px-3 py-2">{o.quantity_kg} kg</td>
                  <td className="px-3 py-2">{formatINR(Number(o.total_amount))}</td>
                  <td className="px-3 py-2 capitalize">{o.status}</td>
                  <td className="px-3 py-2 text-right">
                    {o.status === 'dispatched' && (
                      <button type="button" className="text-xs font-medium text-primary" onClick={() => void markDelivered(o.id)}>
                        Mark delivered
                      </button>
                    )}
                    <Link to={`/buyer/chat?orderId=${o.id}`} className="mt-1 block text-xs text-neutral-600 underline">
                      Chat
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
