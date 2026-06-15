import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)
    if (!isSupabaseConfigured()) {
      setError('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
      return
    }
    setLoading(true)
    const { data, error: signErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (signErr) {
      setError(signErr.message)
      return
    }
    if (data.session) {
      useAuthStore.getState().setSession(data.session)
      await fetchProfile()
      const role = useAuthStore.getState().profile?.role
      if (role === 'admin') navigate('/admin', { replace: true })
      else {
        setError('This account is not an admin.')
        await useAuthStore.getState().signOut()
      }
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Admin login</h1>
      <p className="mt-2 text-sm text-neutral-600">Email + password (separate from public OTP). PRD § Prompt 8.</p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-neutral-700">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-900 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/" className="text-primary hover:underline">
          ← Public site
        </Link>
      </p>
    </main>
  )
}
