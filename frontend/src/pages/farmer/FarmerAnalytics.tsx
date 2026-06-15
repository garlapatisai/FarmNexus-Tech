import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { chatWithFarmAssistant, type GeminiMessage } from '../../services/gemini'

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

// Mock data for demo mode
const MOCK_MONTHLY = [
  { month: 'Jan', revenue: 8200, orders: 12 },
  { month: 'Feb', revenue: 11400, orders: 18 },
  { month: 'Mar', revenue: 9800, orders: 15 },
  { month: 'Apr', revenue: 15600, orders: 24 },
  { month: 'May', revenue: 18900, orders: 28 },
  { month: 'Jun', revenue: 14200, orders: 20 },
]

const MOCK_CROPS = [
  { name: 'Tomatoes', revenue: 24500, orders: 45, color: '#D32F2F' },
  { name: 'Basmati Rice', revenue: 18200, orders: 22, color: '#F57C00' },
  { name: 'Spinach', revenue: 8900, orders: 30, color: '#2E7D32' },
  { name: 'Mangoes', revenue: 12000, orders: 15, color: '#FF9800' },
  { name: 'Wheat', revenue: 6800, orders: 12, color: '#795548' },
]

type MonthData = { month: string; revenue: number; orders: number }
type CropData = { name: string; revenue: number; orders: number; color: string }

export function FarmerAnalytics() {
  const user = useAuthStore((s) => s.user)
  const isLocal = useAuthStore((s) => s.isLocal)

  const [monthlyData, setMonthlyData] = useState<MonthData[]>(MOCK_MONTHLY)
  const [cropData, setCropData] = useState<CropData[]>(MOCK_CROPS)
  const [usingMock, setUsingMock] = useState(true)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const totalRevenue = useMemo(() => monthlyData.reduce((s, m) => s + m.revenue, 0), [monthlyData])
  const totalOrders = useMemo(() => monthlyData.reduce((s, m) => s + m.orders, 0), [monthlyData])
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const bestMonth = useMemo(() => [...monthlyData].sort((a, b) => b.revenue - a.revenue)[0], [monthlyData])
  const topCrop = useMemo(() => [...cropData].sort((a, b) => b.revenue - a.revenue)[0], [cropData])

  // Load real data from Supabase if available
  useEffect(() => {
    if (isLocal || !isSupabaseConfigured() || !user?.id) {
      setUsingMock(true)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount, quantity_kg, created_at, listing_id, status')
          .eq('farmer_id', user.id)
          .in('status', ['delivered', 'dispatched', 'accepted', 'placed'])

        if (cancelled || !orders || orders.length === 0) {
          setUsingMock(true)
          return
        }

        // Aggregate by month
        const byMonth: Record<string, { revenue: number; orders: number }> = {}
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        for (const o of orders) {
          const d = new Date(o.created_at)
          const key = monthNames[d.getMonth()]
          if (!byMonth[key]) byMonth[key] = { revenue: 0, orders: 0 }
          byMonth[key].revenue += Number(o.total_amount ?? 0)
          byMonth[key].orders += 1
        }
        const months = Object.entries(byMonth).map(([month, data]) => ({ month, ...data }))
        if (months.length > 0) setMonthlyData(months)

        // Get crop breakdown
        const listingIds = [...new Set(orders.map(o => o.listing_id).filter(Boolean))] as string[]
        if (listingIds.length > 0) {
          const { data: listings } = await supabase.from('listings').select('id, produce_name').in('id', listingIds)
          const nameMap = Object.fromEntries((listings ?? []).map((l: any) => [l.id, l.produce_name]))
          const byCrop: Record<string, { revenue: number; orders: number }> = {}
          for (const o of orders) {
            const name = nameMap[o.listing_id as string] ?? 'Unknown'
            if (!byCrop[name]) byCrop[name] = { revenue: 0, orders: 0 }
            byCrop[name].revenue += Number(o.total_amount ?? 0)
            byCrop[name].orders += 1
          }
          const colors = ['#2E7D32', '#F57C00', '#D32F2F', '#1F8A70', '#795548', '#7B1FA2']
          const crops = Object.entries(byCrop)
            .map(([name, data], i) => ({ name, ...data, color: colors[i % colors.length] }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 6)
          if (crops.length > 0) setCropData(crops)
        }

        if (!cancelled) setUsingMock(false)
      } catch {
        if (!cancelled) setUsingMock(true)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, isLocal])

  // Generate AI insight
  async function generateInsight() {
    setAiLoading(true)
    setAiError(null)
    try {
      const cropSummary = cropData.slice(0, 3).map(c => `${c.name}: ${formatINR(c.revenue)} (${c.orders} orders)`).join('; ')
      const prompt = `Based on my farm analytics:
- Total revenue: ${formatINR(totalRevenue)} across ${totalOrders} orders
- Best month: ${bestMonth?.month} with ${formatINR(bestMonth?.revenue ?? 0)}
- Top crops: ${cropSummary}
- Average order value: ${formatINR(avgOrderValue)}

Give me 2-3 short, actionable insights to grow my farm business. Focus on seasonal trends, pricing strategy, and crop diversification. Keep it under 100 words.`

      const messages: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }]
      const reply = await chatWithFarmAssistant(messages)
      setAiInsight(reply)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to generate insight')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans pb-16">
      <main className="mx-auto max-w-7xl px-4 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Analytics</h1>
            <p className="mt-1 text-sm text-neutral-500">AI-powered insights into your farm business performance.</p>
          </div>
          <Link
            to="/farmer/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm hover:bg-neutral-50 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        {usingMock && (
          <p className="mb-6 rounded-lg bg-white/60 p-3 text-xs text-neutral-500 backdrop-blur">
            Showing sample analytics data. Real data will appear once you have active orders.
          </p>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KpiCard label="Total Revenue" value={formatINR(totalRevenue)} icon="💰" gradient="from-[#2E7D32] to-[#14532D]" />
          <KpiCard label="Total Orders" value={String(totalOrders)} icon="📦" gradient="from-[#F57C00] to-[#E65100]" />
          <KpiCard label="Avg Order Value" value={formatINR(avgOrderValue)} icon="📊" gradient="from-[#1F8A70] to-[#0D5C46]" />
          <KpiCard label="Top Crop" value={topCrop?.name ?? '—'} icon="🏆" gradient="from-[#333F4D] to-[#1E293B]" />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Revenue Trend */}
          <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-800">Revenue Trend</h2>
              <span className="text-xs font-medium text-neutral-400 bg-neutral-100 px-2 py-1 rounded">Monthly</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2E7D32" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2E7D32" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '13px' }}
                    formatter={(value: any) => [formatINR(Number(value) || 0), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2E7D32" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 4, fill: '#2E7D32', strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Crops */}
          <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-800">Top Crops by Revenue</h2>
              <span className="text-xs font-medium text-neutral-400 bg-neutral-100 px-2 py-1 rounded">{cropData.length} crops</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cropData} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '13px' }}
                    formatter={(value: any) => [formatINR(Number(value) || 0), 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                    {cropData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="rounded-3xl border border-neutral-100 bg-gradient-to-br from-white to-violet-50/50 p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg">
                🧠
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-800">AI Market Insights</h2>
                <p className="text-xs text-neutral-500">Powered by Google Gemini</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void generateInsight()}
              disabled={aiLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 active:scale-95"
            >
              {aiLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Analyzing…
                </>
              ) : (
                <>✨ Generate Insights</>
              )}
            </button>
          </div>

          {aiInsight && (
            <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{aiInsight}</p>
            </div>
          )}

          {aiError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">⚠️ {aiError}</p>
            </div>
          )}

          {!aiInsight && !aiError && !aiLoading && (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
              <p className="text-sm text-neutral-400">Click "Generate Insights" to get AI-powered recommendations based on your analytics data.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function KpiCard({ label, value, icon, gradient }: { label: string; value: string; icon: string; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg hover:-translate-y-1 transition-transform duration-300`}>
      <div className="relative z-10">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">{label}</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-3xl font-extrabold">{value}</p>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl z-0" />
    </div>
  )
}
