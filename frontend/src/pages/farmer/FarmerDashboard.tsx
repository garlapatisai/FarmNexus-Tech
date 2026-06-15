import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { chatWithFarmAssistant, type GeminiMessage, getRegionalDemandTrends, type DemandTrend, getTopCropsPredictions, type TopCropPrediction } from '../../services/gemini'

type DashboardMetrics = {
  totalEarnings: number
  pendingOrders: number
  activeListings: number
  monthOrders: number
}

type OrderRow = {
  id: string
  produce_name: string
  buyer_name: string
  quantity_kg: number
  total_amount: number
  status: string
}

const mockMetrics: DashboardMetrics = {
  totalEarnings: 99500,
  pendingOrders: 1200,
  activeListings: 120,
  monthOrders: 450,
}

const mockRecentOrders: OrderRow[] = [
  { id: '1', produce_name: 'Tomatoes', buyer_name: 'Raj Traders', quantity_kg: 50, total_amount: 1100, status: 'pending' },
  { id: '2', produce_name: 'Tomatoes', buyer_name: 'Fresh Mart', quantity_kg: 100, total_amount: 1800, status: 'delivered' },
  { id: '3', produce_name: 'Tomatoes', buyer_name: 'Annapurna Foods', quantity_kg: 200, total_amount: 4600, status: 'delivered' },
]

// using dynamic state instead of mockProductsItems

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

export function FarmerDashboard() {
  const user = useAuthStore((s) => s.user)
  const [metrics, setMetrics] = useState<DashboardMetrics>(mockMetrics)
  const [recent, setRecent] = useState<OrderRow[]>(mockRecentOrders)
  const [usingMock, setUsingMock] = useState(true)
  const [trends, setTrends] = useState<DemandTrend[]>([
    { region: 'Andhra Pradesh', crop: 'Rice', demand: 92, color: '#2E7D32' },
    { region: 'Maharashtra', crop: 'Mangoes', demand: 85, color: '#F57C00' },
    { region: 'Karnataka', crop: 'Tomatoes', demand: 78, color: '#D32F2F' },
    { region: 'Punjab', crop: 'Wheat', demand: 70, color: '#1F8A70' },
    { region: 'Tamil Nadu', crop: 'Bananas', demand: 65, color: '#7B1FA2' },
  ])
  const [trendsLoading, setTrendsLoading] = useState(false)

  const [products, setProducts] = useState<TopCropPrediction[]>([
    { name: 'Rice', sub: 'Basmati', aiPrice: 42, marketPrice: 40, img: '🌾', highlight: 'orange' },
    { name: 'Wheat', sub: 'Sharbati', aiPrice: 28, marketPrice: 26, img: '🌾', highlight: 'orange' },
    { name: 'Tomatoes', sub: 'Red Cherry', aiPrice: 23, marketPrice: 25, img: '🍅', highlight: 'teal' },
    { name: 'Mangoes', sub: 'Alphonso', aiPrice: 109, marketPrice: 105, img: '🥭', highlight: 'green' },
  ])
  const [productsLoading, setProductsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setTrendsLoading(true)
      setProductsLoading(true)
      try {
        const [trendsData, productsData] = await Promise.all([
          getRegionalDemandTrends(),
          getTopCropsPredictions()
        ])
        if (!cancelled) {
          setTrends(trendsData)
          setProducts(productsData)
        }
      } catch (e) {
        // Using initial fallback state
      } finally {
        if (!cancelled) {
          setTrendsLoading(false)
          setProductsLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // AI Farm Assistant chat state
  type ChatMsg = { role: 'user' | 'model'; text: string }
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: 'model', text: `🌾 Hi! I'm FarmNexus AI. Ask me anything about farming, crop prices, harvest timing, or how to get more buyers!` },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatInput('')
    const newMsg: ChatMsg = { role: 'user', text }
    const updatedMsgs = [...chatMessages, newMsg]
    setChatMessages(updatedMsgs)
    setChatLoading(true)
    try {
      const geminiHistory: GeminiMessage[] = updatedMsgs
        .filter((m) => m.role !== 'model' || updatedMsgs.indexOf(m) > 0) // skip first greeting
        .map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
      const reply = await chatWithFarmAssistant(geminiHistory)
      setChatMessages((prev) => [...prev, { role: 'model', text: reply }])
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: 'model', text: `⚠️ Sorry, I couldn't connect right now. Please try again.` }])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  const farmerId = user?.id

  useEffect(() => {
    if (!farmerId) return
    let cancelled = false
    async function load() {
      try {
        const [listRes, ordersRes, earningsRes, monthRes] = await Promise.all([
          supabase.from('listings').select('id', { count: 'exact', head: true }).eq('farmer_id', farmerId).eq('is_active', true),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('farmer_id', farmerId).in('status', ['placed']),
          supabase
            .from('orders')
            .select('total_amount')
            .eq('farmer_id', farmerId)
            .eq('payment_status', 'paid')
            .in('status', ['delivered', 'dispatched', 'accepted']),
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        ])

        if (cancelled || listRes.error || ordersRes.error || earningsRes.error || monthRes.error) {
          setUsingMock(true)
          return
        }

        const { data: recentRows, error: recentErr } = await supabase
          .from('orders')
          .select('id, listing_id, buyer_id, quantity_kg, total_amount, status')
          .eq('farmer_id', farmerId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (cancelled) return

        const earnings =
          earningsRes.data?.reduce((sum, r: { total_amount: number | string | null }) => sum + Number(r.total_amount ?? 0), 0) ?? 0

        setMetrics({
          totalEarnings: earnings,
          pendingOrders: ordersRes.count ?? 0,
          activeListings: listRes.count ?? 0,
          monthOrders: monthRes.count ?? 0,
        })
        setUsingMock(false)

        if (!recentErr && recentRows && recentRows.length > 0) {
          const listingIds = [...new Set(recentRows.map((r) => r.listing_id).filter(Boolean))] as string[]
          const buyerIds = [...new Set(recentRows.map((r) => r.buyer_id).filter(Boolean))] as string[]
          const { data: nameByListing } = listingIds.length ? await supabase.from('listings').select('id, produce_name').in('id', listingIds) : { data: [] }
          const { data: buyers } = buyerIds.length ? await supabase.from('profiles').select('id, name').in('id', buyerIds) : { data: [] }
          
          const produceMap = Object.fromEntries((nameByListing ?? []).map((l: any) => [l.id, l.produce_name]))
          const buyerMap = Object.fromEntries((buyers ?? []).map((b: any) => [b.id, b.name ?? '—']))
          
          setRecent(
            recentRows.map((r) => ({
              id: String(r.id),
              produce_name: produceMap[r.listing_id as string] ?? '—',
              buyer_name: buyerMap[r.buyer_id as string] ?? '—',
              quantity_kg: Number(r.quantity_kg),
              total_amount: Number(r.total_amount),
              status: String(r.status),
            }))
          )
        }
      } catch {
        if (!cancelled) setUsingMock(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [farmerId])

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans pb-16">

      {/* Hero Header mimicking the mockup */}
      <div className="relative mx-auto mt-6 max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col-reverse lg:flex-row items-center justify-between rounded-3xl bg-white p-8 shadow-sm overflow-hidden relative">
          
          <div className="z-10 flex flex-col space-y-4 lg:w-1/2">
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
              Connecting <br/><span className="text-[#333F4D]">Farmers & Buyers</span>
            </h1>
            <p className="mt-2 max-w-md text-base text-neutral-500 leading-relaxed">
              Empowering agriculture through a smart marketplace for real-time crop trading and direct negotiations.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to="/farmer/listings/new" className="rounded-full bg-[#2E7D32] px-6 py-3 text-sm font-semibold text-white shadow hover:opacity-90 transition-all">
                Get Started
              </Link>
              <Link to="/farmer/listings" className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition-all">
                Explore Marketplace ›
              </Link>
            </div>
          </div>

          {/* Hero Illustration placed absolutely or flex box on the right */}
          <div className="lg:w-1/2 flex justify-end h-64 lg:h-[400px] mb-8 lg:mb-0 relative">
             <img 
               src="/images/hero_farmer.png" 
               alt="Farmer connecting via tablet" 
               className="object-contain h-full relative z-10 hover:scale-105 transition-transform duration-700 w-full lg:w-auto"
             />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#2E7D32]/10 blur-[80px] rounded-full z-0"></div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <main className="mx-auto max-w-7xl px-4 lg:px-8 mt-8">
        
        <h2 className="text-xl font-bold text-neutral-800 mb-4">Marketplace Overview</h2>
        
        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard 
            label="Active Listings" 
            value={String(metrics.activeListings)} 
            gradient="from-[#2E7D32] to-[#14532D]" 
            icon="📊" 
          />
          <MetricCard 
            label="Registered Farmers" 
            value={String(metrics.monthOrders || 450)} 
            gradient="from-[#F57C00] to-[#E65100]" 
            icon="🍃" 
          />
          <MetricCard 
            label="Orders Completed" 
            value={`${(metrics.pendingOrders / 1000).toFixed(1)}K`} 
            gradient="from-[#1F8A70] to-[#0D5C46]" 
            icon="📦" 
          />
          <MetricCard 
            label="Satisfaction Rate" 
            value={"4.8"} 
            gradient="from-[#333F4D] to-[#1E293B]" 
            icon="⭐⭐⭐⭐" 
            highlight="⭐"
          />
        </div>

        {usingMock && (
          <p className="mt-4 rounded-lg bg-white/60 p-3 text-xs text-neutral-500 backdrop-blur">
            Showing sample data. Map and dynamic prices adapt upon active orders.
          </p>
        )}

        {/* Mid Section: Trending Crops & Products */}
        <div className="mt-6 flex flex-col lg:flex-row gap-6">
          <section className="flex-1 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-800 mb-4 flex justify-between items-center">
              Regional Demand Trends
              <div className="flex items-center gap-2">
                {trendsLoading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />}
                <span className="text-[10px] font-semibold text-neutral-400 bg-gradient-to-r from-violet-100 to-indigo-100 px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">✨ AI Generated</span>
              </div>
            </h2>
            <div className="w-full rounded-2xl bg-gradient-to-br from-[#E8F5E9] to-[#E0F2F1] p-5 space-y-4">
              {trends.map((item, idx) => (
                <div key={idx} className="bg-white/80 backdrop-blur rounded-xl p-3 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: item.color }}>
                    {item.region.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-semibold text-neutral-800 truncate">{item.region}</p>
                      <span className="text-xs font-bold ml-2 shrink-0" style={{ color: item.color }}>{item.demand}%</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.demand}%`, backgroundColor: item.color }} />
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-1">Top crop: {item.crop}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex-1 flex flex-col gap-4">
             <div className="grid grid-cols-2 gap-4 relative">
                {productsLoading && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                )}
                {products.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-50 to-transparent w-16 h-full z-0 opacity-50"></div>
                    <div className="flex gap-3 items-center z-10 w-full">
                       <div className="w-12 h-12 bg-neutral-50 rounded-xl text-2xl flex items-center justify-center shadow-inner shrink-0">{item.img}</div>
                       <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start">
                           <p className="font-bold text-neutral-800 text-sm truncate">{item.name}</p>
                           <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2 shrink-0">AI</span>
                         </div>
                         <p className="text-[10px] text-neutral-500 truncate leading-none mt-0.5">{item.sub}</p>
                         <div className="mt-2 flex items-baseline justify-between gap-1 flex-wrap">
                           <p className={`text-[13px] font-extrabold ${item.highlight === 'orange' ? 'text-[#F57C00]' : 'text-[#2E7D32]'}`}>
                             ₹{item.aiPrice}<span className="text-[9px] font-medium text-neutral-500">/kg</span>
                           </p>
                           <p className="text-[9px] text-neutral-400 font-medium">Market: ₹{item.marketPrice}</p>
                         </div>
                       </div>
                    </div>
                  </div>
                ))}
             </div>

             <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                   <div>
                     <p className="text-xs text-neutral-500 font-medium tracking-wide">Total Earnings</p>
                     <p className="text-3xl font-extrabold text-neutral-900 mt-1">{formatINR(metrics.totalEarnings)}</p>
                   </div>
                   <div className="w-10 h-10 rounded-full bg-[#1F8A70]/10 flex items-center justify-center text-[#1F8A70]">📈</div>
                </div>
                <div className="mt-4">
                   <p className="text-sm font-semibold text-neutral-800 mb-2">Analytics Insights</p>
                   <div className="flex justify-between items-center text-xs border-b border-neutral-50 pb-2">
                     <span className="text-neutral-600">▲ 12% Revenue Growth</span>
                     <span className="font-mono text-neutral-800">{formatINR(5400)}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs pt-2">
                     <span className="font-bold text-[#2E7D32]">■ 94% Order Success</span>
                     <span className="font-mono text-neutral-800">{formatINR(5100)}</span>
                   </div>
                </div>
             </div>
          </section>
        </div>

        {/* Bottom Section: Chat & Orders */}
        <div className="mt-6 flex flex-col lg:flex-row gap-6">
           {/* AI Farm Assistant Chat Panel */}
           <section className="flex-1 rounded-3xl border border-neutral-100 bg-white shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '360px', maxHeight: '420px' }}>
             <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">🌾</div>
                  <div>
                    <h2 className="text-sm font-bold text-neutral-800 leading-none">FarmNexus AI</h2>
                    <p className="text-[10px] text-emerald-500 font-medium">● Online</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-neutral-400 bg-gradient-to-r from-violet-100 to-indigo-100 px-2 py-1 rounded-full">✨ Powered by Gemini</span>
             </div>

             {/* Message thread */}
             <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F8FAFB]">
               {chatMessages.map((msg, idx) => (
                 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   {msg.role === 'model' && (
                     <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-[10px] mr-2 shrink-0 mt-1">🌾</div>
                   )}
                   <div
                     className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                       msg.role === 'user'
                         ? 'bg-[#2E7D32] text-white rounded-br-sm'
                         : 'bg-white text-neutral-800 border border-neutral-100 rounded-bl-sm'
                     }`}
                   >
                     {msg.text}
                   </div>
                 </div>
               ))}
               {chatLoading && (
                 <div className="flex justify-start">
                   <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-[10px] mr-2 shrink-0">🌾</div>
                   <div className="bg-white border border-neutral-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                     <span className="flex gap-1">
                       <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                       <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                       <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                     </span>
                   </div>
                 </div>
               )}
               <div ref={chatEndRef} />
             </div>

             {/* Input row */}
             <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-neutral-100 bg-white">
               <input
                 id="farm-assistant-input"
                 type="text"
                 value={chatInput}
                 onChange={(e) => setChatInput(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendChatMessage() } }}
                 placeholder="Ask anything about farming…"
                 className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all"
               />
               <button
                 type="button"
                 id="farm-assistant-send-btn"
                 onClick={() => void sendChatMessage()}
                 disabled={chatLoading || !chatInput.trim()}
                 className="w-8 h-8 rounded-xl bg-[#2E7D32] flex items-center justify-center text-white shadow hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                   <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                 </svg>
               </button>
             </div>
           </section>

           {/* Recent Orders Panel */}
           <section className="flex-1 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-neutral-800">Recent Orders</h2>
                <Link to="/farmer/orders" className="text-xs font-normal text-primary hover:underline bg-neutral-100 px-2 py-1 rounded">ALL ORDERS ››</Link>
             </div>
             <div className="space-y-4">
                {recent.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-2xl border border-neutral-50 hover:shadow-sm transition-all bg-[#fafafa]">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">
                          {order.produce_name.includes('Tomato') ? '🍅' : '🌾'}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-neutral-800">{order.buyer_name}</p>
                          <p className="text-xs text-neutral-500">■ {order.quantity_kg}kg</p>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                       <p className="font-mono text-sm font-bold text-neutral-600">{formatINR(order.total_amount)}</p>
                       <span className={`px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                          order.status === 'delivered' ? 'bg-[#1F8A70]/10 text-[#1F8A70]' : 'bg-amber-100 text-amber-800'
                       }`}>
                         {order.status}
                       </span>
                     </div>
                  </div>
                ))}
                {recent.length === 0 && (
                   <p className="text-sm text-neutral-500 italic p-4 text-center">No recent orders found.</p>
                )}
             </div>
           </section>
        </div>
      </main>
    </div>
  )
}

function MetricCard({ label, value, icon, gradient, highlight }: { label: string; value: string; icon: string; gradient: string; highlight?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg hover:-translate-y-1 transition-transform duration-300`}>
      <div className="relative z-10">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">{label}</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-3xl font-extrabold">{value}</p>
          <span className="text-base font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur flex items-center gap-1">
             {highlight} {icon}
          </span>
        </div>
      </div>
      {/* Abstract decorative orb */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl z-0"></div>
    </div>
  )
}
