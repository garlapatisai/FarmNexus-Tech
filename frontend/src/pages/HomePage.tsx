import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const STATS = [
  { label: 'Active Farmers', value: '2,500+', icon: '🌾' },
  { label: 'Crops Listed', value: '8,000+', icon: '🥬' },
  { label: 'Orders Delivered', value: '15K+', icon: '📦' },
  { label: 'Districts Covered', value: '120+', icon: '📍' },
]

const FEATURES = [
  {
    icon: '✨',
    title: 'AI Price Advisor',
    description: 'Get Gemini-powered price suggestions based on real-time market data. Know the fair price before you list.',
    gradient: 'from-violet-500 to-indigo-600',
    delay: 'animate-fade-in-up-delay-1',
  },
  {
    icon: '🧠',
    title: 'Smart Search',
    description: 'Type naturally — "cheap vegetables near Pune" — and AI parses your intent into precise filters.',
    gradient: 'from-emerald-500 to-teal-600',
    delay: 'animate-fade-in-up-delay-2',
  },
  {
    icon: '🌾',
    title: 'Farm Assistant',
    description: 'Chat with an AI expert about harvest timing, soil health, pest control, and market strategies.',
    gradient: 'from-amber-500 to-orange-600',
    delay: 'animate-fade-in-up-delay-3',
  },
]

const STEPS = [
  { step: '01', title: 'Register', desc: 'Quick sign-up as Farmer or Buyer — no passwords needed', icon: '📝' },
  { step: '02', title: 'List or Browse', desc: 'Farmers list produce with AI-suggested prices. Buyers search with AI.', icon: '🔍' },
  { step: '03', title: 'Order & Connect', desc: 'Direct orders, in-app chat, and UPI payments. No middlemen.', icon: '🤝' },
]

export function HomePage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const initialized = useAuthStore((s) => s.initialized)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!initialized) return
    if (profile?.role === 'farmer') navigate('/farmer/dashboard', { replace: true })
    else if (profile?.role === 'buyer') navigate('/buyer/home', { replace: true })
    else if (profile?.role === 'admin') navigate('/admin', { replace: true })
  }, [profile, initialized, navigate])

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  return (
    <main className="overflow-hidden">
      {/* ═══════════════════════ HERO SECTION ═══════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center bg-gradient-to-br from-[#f0fdf4] via-white to-[#ecfdf5]">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#2E7D32]/8 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-20 w-80 h-80 bg-[#F57C00]/8 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-10 left-1/4 w-64 h-64 bg-[#1F8A70]/6 rounded-full blur-3xl animate-pulse-glow" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle, #2E7D32 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 lg:px-8 text-center">
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full bg-white/80 border border-emerald-200 px-4 py-1.5 shadow-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-700 tracking-wide">Powered by Google Gemini AI</span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-neutral-900 leading-[1.1]">
            Farm to Buyer.
            <br />
            <span className="bg-gradient-to-r from-[#2E7D32] to-[#1F8A70] bg-clip-text text-transparent">
              Zero Middlemen.
            </span>
          </h1>

          <p className="animate-fade-in-up-delay-1 mt-6 mx-auto max-w-2xl text-lg sm:text-xl text-neutral-600 leading-relaxed">
            India's AI-powered agricultural marketplace. Fair prices for farmers,
            transparent supply for buyers — with smart pricing, natural language search,
            and a personal farm assistant.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up-delay-2 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-[#2E7D32] px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95"
            >
              Get Started Free
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-8 py-4 text-base font-bold text-neutral-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:-translate-y-0.5 active:scale-95"
            >
              Sign In
            </Link>
          </div>

          {/* Trust bar */}
          <div className="animate-fade-in-up-delay-3 mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-neutral-400">
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> No credit card needed</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> UPI payments</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Andhra Pradesh & Karnataka pilot</span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${scrolled ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex flex-col items-center gap-2 text-neutral-400">
            <span className="text-xs font-medium tracking-wider uppercase">Scroll</span>
            <div className="w-5 h-8 rounded-full border-2 border-neutral-300 flex justify-center pt-1.5">
              <div className="w-1 h-2 rounded-full bg-neutral-400 animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ STATS BAR ═══════════════════════ */}
      <section className="relative bg-white border-y border-neutral-100">
        <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="text-3xl mb-2 transition-transform group-hover:scale-125">{stat.icon}</div>
                <p className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-neutral-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ AI FEATURES ═══════════════════════ */}
      <section className="relative bg-gradient-to-b from-white to-[#f8fafb] py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 mb-4">
              🤖 AI-Powered
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight">
              Smarter Agriculture
            </h2>
            <p className="mt-4 text-lg text-neutral-500 max-w-xl mx-auto">
              Three AI features that make FarmNexus the most intelligent agri-marketplace in India.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`${f.delay} group relative overflow-hidden rounded-3xl border border-neutral-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl`}
              >
                {/* Gradient orb */}
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${f.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
                <div className={`relative z-10 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} text-2xl text-white shadow-lg mb-5`}>
                  {f.icon}
                </div>
                <h3 className="relative z-10 text-xl font-bold text-neutral-900 mb-2">{f.title}</h3>
                <p className="relative z-10 text-sm text-neutral-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight">
              Three Simple Steps
            </h2>
            <p className="mt-4 text-lg text-neutral-500">From registration to your first transaction in minutes.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={i} className="relative text-center group">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-emerald-200 to-transparent" />
                )}
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 text-3xl mb-5 transition-transform group-hover:scale-110 group-hover:shadow-lg">
                  {s.icon}
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#2E7D32] text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ CTA SPLIT ═══════════════════════ */}
      <section className="bg-gradient-to-b from-[#f8fafb] to-white py-24">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Farmer CTA */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2E7D32] to-[#1b5e20] p-10 text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute top-6 right-6 text-6xl opacity-20 transition-transform group-hover:scale-110">🌾</div>
              <div className="relative z-10">
                <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold mb-4">For Farmers</span>
                <h3 className="text-2xl font-bold mb-3">Grow & Earn More</h3>
                <p className="text-sm text-white/80 leading-relaxed mb-6">
                  List your produce, get AI-powered fair pricing, connect with buyers directly, and grow your agricultural business.
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#2E7D32] shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                >
                  Start as Farmer →
                </Link>
              </div>
            </div>

            {/* Buyer CTA */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F57C00] to-[#E65100] p-10 text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute top-6 right-6 text-6xl opacity-20 transition-transform group-hover:scale-110">🛒</div>
              <div className="relative z-10">
                <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold mb-4">For Buyers</span>
                <h3 className="text-2xl font-bold mb-3">Source Fresh Produce</h3>
                <p className="text-sm text-white/80 leading-relaxed mb-6">
                  Browse, search naturally with AI, compare prices, and order directly from verified farmers across India.
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#E65100] shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                >
                  Start as Buyer →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="border-t border-neutral-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2E7D32]/10 text-xl">🌾</span>
              <span className="text-xl font-extrabold text-[#2E7D32]">
                FarmNexus<span className="text-[#F57C00] font-medium text-sm ml-1">TECH</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-neutral-400">
              <Link to="/login" className="hover:text-neutral-700 transition-colors">Login</Link>
              <Link to="/register" className="hover:text-neutral-700 transition-colors">Register</Link>
              <Link to="/admin/login" className="hover:text-neutral-700 transition-colors">Admin</Link>
            </div>
            <p className="text-xs text-neutral-400">
              © {new Date().getFullYear()} FarmNexus Tech. Built with ❤️ for Indian agriculture.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
