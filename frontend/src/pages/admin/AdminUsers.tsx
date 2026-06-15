import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type ProfileRow = {
  id: string
  name: string | null
  phone: string | null
  role: string
  district: string | null
  is_suspended: boolean
  created_at: string
}

const PAGE = 15

export function AdminUsers() {
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const from = page * PAGE
    const to = from + PAGE - 1
    const { data, error: e, count } = await supabase
      .from('profiles')
      .select('id, name, phone, role, district, is_suspended, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    setLoading(false)
    if (e) {
      setError(e.message)
      setRows([])
      return
    }
    setError(null)
    setRows((data as ProfileRow[]) ?? [])
    setTotal(count ?? 0)
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleSuspend(id: string, next: boolean) {
    const { error: e } = await supabase.from('profiles').update({ is_suspended: next }).eq('id', id)
    if (e) {
      alert(e.message)
      return
    }
    void load()
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">Users</h1>
        <Link to="/admin" className="text-sm text-primary underline">
          ← Dashboard
        </Link>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-neutral-600">Loading…</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">District</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100">
                  <td className="px-3 py-2 font-medium">{r.name ?? '—'}</td>
                  <td className="px-3 py-2">{r.phone ?? '—'}</td>
                  <td className="px-3 py-2 capitalize">{r.role}</td>
                  <td className="px-3 py-2">{r.district ?? '—'}</td>
                  <td className="px-3 py-2">{r.is_suspended ? <span className="text-red-600">Suspended</span> : 'Active'}</td>
                  <td className="px-3 py-2 text-right">
                    {r.role !== 'admin' && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary underline"
                        onClick={() => void toggleSuspend(r.id, !r.is_suspended)}
                      >
                        {r.is_suspended ? 'Activate' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
          Page {page + 1} · {total} users
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
