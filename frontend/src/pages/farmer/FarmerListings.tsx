import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatINR } from '../../lib/format'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
// Shared in-memory store — same reference as FarmerListingFormPage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localListingsRef: Record<string, any> = (window as any).__farmnexusLocalListings ??
  ((window as any).__farmnexusLocalListings = {})


type ListingRow = {
  id: string
  produce_name: string
  category: string
  price_per_kg: number
  quantity_kg: number
  min_order_kg: number
  is_active: boolean
  photos: string[] | null
  created_at: string
}

export function FarmerListings() {
  const user = useAuthStore((s) => s.user)
  const isLocal = useAuthStore((s) => s.isLocal)
  const [rows, setRows] = useState<ListingRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    // Local session mode — show listings from the in-memory store
    if (isLocal || !isSupabaseConfigured()) {
      const local = Object.values(localListingsRef) as ListingRow[]
      // Merge with default demo rows if no local listings yet
      const demo: ListingRow[] = local.length === 0 ? [
        { id: 'l1', produce_name: 'Cherry Tomatoes', category: 'vegetable', price_per_kg: 45, quantity_kg: 120, min_order_kg: 5, is_active: true, photos: [], created_at: new Date().toISOString() },
        { id: 'l2', produce_name: 'Spinach', category: 'vegetable', price_per_kg: 30, quantity_kg: 40, min_order_kg: 2, is_active: true, photos: [], created_at: new Date().toISOString() },
      ] : local
      setRows(demo)
      setError(null)
      setLoading(false)
      return
    }

    const { data, error: e } = await supabase
      .from('listings')
      .select('id, produce_name, category, price_per_kg, quantity_kg, min_order_kg, is_active, photos, created_at')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (e) {
      // If Supabase fails (e.g. RLS not set up), show local listings
      const local = Object.values(localListingsRef) as ListingRow[]
      setRows(local)
      setError(null)
      return
    }
    setError(null)
    setRows((data as ListingRow[]) ?? [])
  }, [user?.id, isLocal])

  useEffect(() => {
    void load()
  }, [load])

  async function removeRow(id: string) {
    if (!confirm('Delete this listing?')) return

    if (isLocal || !isSupabaseConfigured() || id.startsWith('local-')) {
      delete localListingsRef[id]
      setRows((prev) => prev.filter((r) => r.id !== id))
      return
    }

    const { error: e } = await supabase.from('listings').delete().eq('id', id).eq('farmer_id', user?.id ?? '')
    if (e) { alert(e.message); return }
    void load()
  }

  async function toggleActive(id: string, next: boolean) {
    if (!isSupabaseConfigured()) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: next } : r)))
      return
    }

    const { error: e } = await supabase.from('listings').update({ is_active: next }).eq('id', id).eq('farmer_id', user?.id ?? '')
    if (e) {
      alert(e.message)
      return
    }
    void load()
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My listings</h1>
          <p className="text-sm text-neutral-600">Manage produce and photos (Supabase `listings` + Storage).</p>
        </div>
        <Link
          to="/farmer/listings/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
        >
          + New listing
        </Link>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="mt-8 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-neutral-600">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-neutral-600">No listings yet. Add your first batch of produce.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Produce</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price/kg</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Min</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const thumb = r.photos?.[0]
                return (
                  <tr key={r.id} className="border-b border-neutral-100">
                    <td className="px-4 py-2">
                      {thumb ? (
                        <img src={thumb} alt="" className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-medium">{r.produce_name}</td>
                    <td className="px-4 py-2 capitalize">{r.category}</td>
                    <td className="px-4 py-2">{formatINR(Number(r.price_per_kg))}</td>
                    <td className="px-4 py-2">{r.quantity_kg} kg</td>
                    <td className="px-4 py-2">{r.min_order_kg} kg</td>
                    <td className="px-4 py-2">
                      {r.quantity_kg <= 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">⊗ Sold Out</span>
                      ) : r.is_active ? (
                        <span className="text-emerald-700">Active</span>
                      ) : (
                        <span className="text-neutral-500">Hidden</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link to={`/farmer/listings/${r.id}/edit`} className="text-xs font-medium text-primary hover:underline">
                          Edit
                        </Link>
                        <button type="button" className="text-xs text-neutral-600 hover:underline" onClick={() => void toggleActive(r.id, !r.is_active)}>
                          {r.is_active ? 'Hide' : 'Show'}
                        </button>
                        <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => void removeRow(r.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
