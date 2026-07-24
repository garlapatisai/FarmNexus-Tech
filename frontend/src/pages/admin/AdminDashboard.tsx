import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { localOrdersRef, localUsersRef } from '../../lib/localDb'

export function AdminDashboard() {
  const [farmers, setFarmers] = useState<number | null>(null)
  const [buyers, setBuyers] = useState<number | null>(null)
  const [ordersToday, setOrdersToday] = useState<number | null>(null)
  const [disputes, setDisputes] = useState<number | null>(null)
  const [series, setSeries] = useState<{ day: string; orders: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const isLocal = useAuthStore((s) => s.isLocal)

  useEffect(() => {
    void (async () => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)

      if (isLocal || !isSupabaseConfigured()) {
        const allUsers = Object.values(localUsersRef)
        const allOrders = Object.values(localOrdersRef)

        const farmersCount = allUsers.filter((u: any) => u.role === 'farmer').length
        const buyersCount = allUsers.filter((u: any) => u.role === 'buyer').length

        const todayStr = start.toISOString().slice(0, 10)
        const ordersTodayCount = allOrders.filter((o: any) => o.created_at.slice(0, 10) >= todayStr).length
        const disputesCount = allOrders.filter((o: any) => o.status === 'disputed').length

        setFarmers(farmersCount)
        setBuyers(buyersCount)
        setOrdersToday(ordersTodayCount)
        setDisputes(disputesCount)

        const byDay: Record<string, number> = {}
        for (let i = 0; i < 30; i++) {
          const d = new Date()
          d.setDate(d.getDate() - (29 - i))
          const key = d.toISOString().slice(0, 10)
          byDay[key] = 0
        }
        for (const o of allOrders) {
          const key = String(o.created_at).slice(0, 10)
          if (key in byDay) byDay[key]++
        }
        setSeries(
          Object.entries(byDay).map(([day, orders]) => ({
            day: day.slice(8),
            orders,
          })),
        )
        return
      }

      const [fc, bc, oc, dc] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'farmer'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'buyer'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', start.toISOString()),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'disputed'),
      ])
      if (fc.error || bc.error || oc.error || dc.error) {
        setError(fc.error?.message ?? bc.error?.message ?? oc.error?.message ?? dc.error?.message ?? 'Load failed')
        return
      }
      setFarmers(fc.count ?? 0)
      setBuyers(bc.count ?? 0)
      setOrdersToday(oc.count ?? 0)
      setDisputes(dc.count ?? 0)

      const since = new Date()
      since.setDate(since.getDate() - 29)
      since.setHours(0, 0, 0, 0)
      const { data: ordRows } = await supabase.from('orders').select('created_at').gte('created_at', since.toISOString())
      const byDay: Record<string, number> = {}
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        const key = d.toISOString().slice(0, 10)
        byDay[key] = 0
      }
      for (const r of ordRows ?? []) {
        const key = String(r.created_at).slice(0, 10)
        if (key in byDay) byDay[key]++
      }
      setSeries(
        Object.entries(byDay).map(([day, orders]) => ({
          day: day.slice(8),
          orders,
        })),
      )
    })()
  }, [])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">Admin</h1>
        <div className="flex gap-3 text-sm">
          <Link to="/admin/users" className="text-primary underline">
            Users
          </Link>
          <Link to="/admin/orders" className="text-primary underline">
            Orders
          </Link>
          <Link to="/admin/ai-monitoring" className="text-primary font-semibold underline flex items-center gap-1">
            ⚡ AI Monitoring
          </Link>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Farmers', value: farmers, icon: '🌾' },
          { label: 'Buyers', value: buyers, icon: '🏪' },
          { label: "Today's orders", value: ordersToday, icon: '📦' },
          { label: 'Disputed', value: disputes, icon: '⚠️' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <span className="text-2xl">{c.icon}</span>
            <p className="mt-2 text-2xl font-bold">{c.value ?? '—'}</p>
            <p className="text-sm text-neutral-600">{c.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Orders per day (30 days)</h2>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.length ? series : [{ day: '—', orders: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#1b6b3a" strokeWidth={2} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  )
}
