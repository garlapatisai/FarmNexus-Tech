import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore, type UserRole } from '../store/authStore'

export function RegisterPage() {
  const navigate = useNavigate()
  const createLocalSession = useAuthStore((s) => s.createLocalSession)
  const profile = useAuthStore((s) => s.profile)

  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [role, setRole] = useState<UserRole>(null)
  const [error, setError] = useState<string | null>(null)

  // Already registered — go directly to dashboard
  useEffect(() => {
    if (profile?.role === 'farmer') navigate('/farmer/dashboard', { replace: true })
    else if (profile?.role === 'buyer') navigate('/buyer/home', { replace: true })
    else if (profile?.role === 'admin') navigate('/admin', { replace: true })
  }, [profile, navigate])

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Please enter your full name.'); return }
    if (!mobile.trim()) { setError('Please enter your mobile number.'); return }
    if (!role) { setError('Please select Farmer or Buyer.'); return }

    // Create a local session — instant, no Supabase needed, survives page refresh
    createLocalSession(role, { name: name.trim(), phone: mobile.trim() })
    navigate(role === 'farmer' ? '/farmer/dashboard' : '/buyer/home', { replace: true })
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Create account</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Fill in your details once — you won't be asked again until you log out.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        {/* Full Name */}
        <label className="block text-sm font-medium text-neutral-700">
          Full name
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. Ravi Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>

        {/* Mobile */}
        <label className="block text-sm font-medium text-neutral-700">
          Mobile number
          <input
            type="tel"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. 9876543210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            autoComplete="tel"
            required
          />
        </label>

        {/* Role */}
        <div>
          <p className="text-sm font-medium text-neutral-700">I am a…</p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              className={`flex-1 rounded-lg border-2 py-3 font-semibold transition-colors ${
                role === 'farmer'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
              }`}
              onClick={() => setRole('farmer')}
            >
              🌾 Farmer
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg border-2 py-3 font-semibold transition-colors ${
                role === 'buyer'
                  ? 'border-accent bg-accent/5 text-accent'
                  : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
              }`}
              onClick={() => setRole('buyer')}
            >
              🛒 Buyer
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || !mobile.trim() || !role}
          className="w-full rounded-lg bg-primary py-2.5 font-semibold text-white disabled:opacity-50"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Login
        </Link>
      </p>
    </main>
  )
}
