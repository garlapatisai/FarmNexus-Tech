import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatINR } from '../../lib/format'
import { supabase } from '../../lib/supabase'

type OrderRow = {
  id: string
  status: string
  payment_status: string
  quantity_kg: number
  total_amount: number
  delivery_address: string | null
  reject_reason: string | null
  created_at: string
}

const PAGE = 20

export function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [rows, setRows] = useState<OrderRow[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const from = page * PAGE
    const to = from + PAGE - 1
    let q = supabase
      .from('orders')
      .select('id, status, payment_status, quantity_kg, total_amount, delivery_address, reject_reason, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (statusFilter) q = q.eq('status', statusFilter)
    const { data, error: e, count } = await q.range(from, to)
    setLoading(false)
    if (e) {
      setError(e.message)
      setRows([])
      return
    }
    setError(null)
    setRows((data as OrderRow[]) ?? [])
    setTotal(count ?? 0)
  }, [page, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function flagDispute(id: string) {
    const { error: e } = await supabase.from('orders').update({ status: 'disputed' }).eq('id', id)
    if (e) {
      alert(e.message)
      return
    }
    void load()
  }

  async function saveNote(id: string) {
    if (!note.trim()) return
    const { error: e } = await supabase.from('orders').update({ reject_reason: note.trim() }).eq('id', id)
    if (e) {
      alert(e.message)
      return
    }
    setNote('')
    void load()
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">Orders</h1>
        <Link to="/admin" className="text-sm text-primary underline">
          ← Dashboard
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-neutral-700">
          Status
          <select
            className="ml-2 rounded border border-neutral-300 px-2 py-1 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setPage(0)
              setStatusFilter(e.target.value)
            }}
          >
            <option value="">All</option>
            <option value="placed">Placed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="disputed">Disputed</option>
          </select>
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-neutral-600">Loading…</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Pay</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 align-top">
                  <td className="px-3 py-2 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-3 py-2 capitalize">{o.status}</td>
                  <td className="px-3 py-2">{o.payment_status}</td>
                  <td className="px-3 py-2">{o.quantity_kg}</td>
                  <td className="px-3 py-2">{formatINR(Number(o.total_amount))}</td>
                  <td className="max-w-[180px] px-3 py-2 text-xs text-neutral-600">{o.delivery_address}</td>
                  <td className="max-w-[160px] px-3 py-2 text-xs">{o.reject_reason ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="text-xs text-red-600 underline" onClick={() => void flagDispute(o.id)}>
                      Flag dispute
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <p className="text-sm font-medium text-neutral-800">Dispute / resolution note</p>
        <p className="text-xs text-neutral-500">Writes to order reject_reason field for prototype reconciliation.</p>
        <textarea className="mt-2 w-full rounded border px-3 py-2 text-sm" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="mt-2 text-xs text-neutral-500">Select an order row — paste ID to update (quick tool):</p>
        <div className="mt-2 flex gap-2">
          <input className="flex-1 rounded border px-2 py-1 font-mono text-xs" placeholder="order uuid" id="admin-order-id" />
          <button
            type="button"
            className="rounded bg-neutral-900 px-3 py-1 text-xs text-white"
            onClick={() => {
              const el = document.getElementById('admin-order-id') as HTMLInputElement | null
              const id = el?.value?.trim()
              if (id) void saveNote(id)
            }}
          >
            Save note
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          className="rounded border px-3 py-1 disabled:opacity-40"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </button>
        <span className="text-neutral-600">
          Page {page + 1} · {total} orders
        </span>
        <button
          type="button"
          className="rounded border px-3 py-1 disabled:opacity-40"
          disabled={(page + 1) * PAGE >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </main>
  )
}
