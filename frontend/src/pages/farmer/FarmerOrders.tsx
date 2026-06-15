import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  buyer_id: string
  quantity_kg: number
  total_amount: number
  status: string
  payment_status: string
  delivery_address: string | null
  reject_reason: string | null
  produce_name?: string
  buyer_name?: string
  unsold_quantity?: number
}

export function FarmerOrders() {
  const user = useAuthStore((s) => s.user)
  const isLocal = useAuthStore((s) => s.isLocal)
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
            unsold_quantity: l?.quantity_kg || 0,
            buyer_name: 'Local Buyer',
          }
        }) as OrderRow[]
      )
      setError(null)
      setLoading(false)
      return
    }

    const { data: orders, error: oe } = await supabase
      .from('orders')
      .select('id, listing_id, buyer_id, quantity_kg, total_amount, status, payment_status, delivery_address, reject_reason')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false })

    if (oe) {
      setError(oe.message)
      setRows([])
      setLoading(false)
      return
    }

    const listingIds = [...new Set((orders ?? []).map((o) => o.listing_id))]
    const buyerIds = [...new Set((orders ?? []).map((o) => o.buyer_id))]

    let lmap: Record<string, { produce_name: string; quantity_kg: number }> = {}
    if (listingIds.length) {
      const { data: listings } = await supabase.from('listings').select('id, produce_name, quantity_kg').in('id', listingIds)
      lmap = Object.fromEntries((listings ?? []).map((l) => [l.id, { produce_name: l.produce_name, quantity_kg: l.quantity_kg }]))
    }
    let bmap: Record<string, string> = {}
    if (buyerIds.length) {
      const { data: buyers } = await supabase.from('profiles').select('id, name').in('id', buyerIds)
      bmap = Object.fromEntries((buyers ?? []).map((b) => [b.id, b.name ?? 'Buyer']))
    }

    setRows(
      (orders ?? []).map((o) => ({
        ...o,
        produce_name: lmap[o.listing_id]?.produce_name,
        unsold_quantity: lmap[o.listing_id]?.quantity_kg,
        buyer_name: bmap[o.buyer_id],
      })) as OrderRow[],
    )
    setError(null)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(id: string, status: string, rejectReason?: string | null) {
    if (isLocal || !isSupabaseConfigured()) {
      if (status === 'accepted') {
        const order = rows.find((r) => r.id === id)
        if (!order) return
        // No wait logic for local payment simulation yet
      }
      if (localOrdersRef[id]) {
        localOrdersRef[id].status = status
        if (rejectReason !== undefined) localOrdersRef[id].reject_reason = rejectReason
      }
      void load()
      return
    }

    const patch: Record<string, unknown> = { status }
    if (rejectReason !== undefined) patch.reject_reason = rejectReason

    if (status === 'accepted') {
      const order = rows.find((r) => r.id === id)
      if (!order) return
      // Stock was already deducted when the order was placed by the buyer.
      // No additional stock update needed here.
    }

    const { error: e } = await supabase.from('orders').update(patch).eq('id', id).eq('farmer_id', user?.id ?? '')
    if (e) {
      alert(e.message)
      return
    }
    void load()
  }

  function reject(id: string) {
    const reason = prompt('Reason for rejection?') ?? ''
    void setStatus(id, 'rejected', reason || null)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Orders</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-neutral-600">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-neutral-600">No orders yet.</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2">Produce</th>
                <th className="px-3 py-2">Buyer</th>
                <th className="px-3 py-2">Order Qty</th>
                <th className="px-3 py-2 text-neutral-500">Unsold Qty</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 align-top">
                  <td className="px-3 py-2 font-medium">{o.produce_name}</td>
                  <td className="px-3 py-2">{o.buyer_name}</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">{o.quantity_kg} kg</td>
                  <td className="px-3 py-2 text-neutral-500">{o.unsold_quantity} kg</td>
                  <td className="px-3 py-2 font-medium">{formatINR(Number(o.total_amount))}</td>
                  <td className="px-3 py-2 capitalize">
                    {o.status}
                    {o.reject_reason ? <span className="mt-1 block text-xs text-red-600">{o.reject_reason}</span> : null}
                  </td>
                  <td className="max-w-[200px] px-3 py-2 text-xs text-neutral-600">{o.delivery_address}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-col items-end gap-1">
                      {o.status === 'placed' && (
                        <>
                          <button type="button" className="text-xs font-medium text-primary" onClick={() => void setStatus(o.id, 'accepted')}>
                            Accept
                          </button>
                          <button type="button" className="text-xs text-red-600" onClick={() => reject(o.id)}>
                            Reject
                          </button>
                        </>
                      )}
                      {o.status === 'accepted' && (
                        <button type="button" className="text-xs font-medium text-primary" onClick={() => void setStatus(o.id, 'dispatched')}>
                          Mark dispatched
                        </button>
                      )}
                      <Link to={`/farmer/chat?orderId=${o.id}`} className="text-xs text-neutral-600 underline">
                        Chat
                      </Link>
                    </div>
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
