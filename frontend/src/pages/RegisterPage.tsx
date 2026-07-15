import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore, type UserRole } from '../store/authStore'
import { localUsersRef } from '../lib/localDb'

export function RegisterPage() {
  const navigate = useNavigate()
  const createLocalSession = useAuthStore((s) => s.createLocalSession)
  const profile = useAuthStore((s) => s.profile)

  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
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
    if (password.length < 6) { setError('Password must be at least 6 characters long.'); return }
    if (!role) { setError('Please select Farmer or Buyer.'); return }

    // Check if user already exists
    const allUsers = Object.values(localUsersRef)
    const userExists = allUsers.some((u: any) => u.phone === mobile.trim() && u.role === role)
    if (userExists) {
      setError('An account with this mobile number already exists for this role.')
      return
    }

    // Create a local session — instant, no Supabase needed, survives page refresh
    createLocalSession(role, { name: name.trim(), phone: mobile.trim(), password: password })
    navigate(role === 'farmer' ? '/farmer/dashboard' : '/buyer/home', { replace: true })
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between">
      {/* Standalone clean signup header */}
      <header className="py-4 px-6 md:px-12 flex justify-between items-center border-b border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-[#2E7D32] no-underline">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2E7D32]/10 text-xl" aria-hidden>
            🌾
          </span>
          <span>FarmNexus<span className="text-[#F57C00] font-medium text-sm ml-1">TECH</span></span>
        </Link>
        <Link to="/login" className="text-sm font-semibold text-neutral-600 hover:text-[#2E7D32] transition-colors no-underline">
          Sign In
        </Link>
      </header>

      {/* Main signup box */}
      <main className="mx-auto max-w-md w-full px-4 py-12 flex-1 flex flex-col justify-center">
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

          {/* Password */}
          <label className="block text-sm font-medium text-neutral-700">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
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
            disabled={!name.trim() || !mobile.trim() || password.length < 6 || !role}
            className="w-full rounded-lg bg-primary py-2.5 font-semibold text-white disabled:opacity-50 cursor-pointer"
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

      {/* Standalone clean footer */}
      <footer className="py-6 text-center text-xs text-neutral-500 border-t border-neutral-100 bg-white">
        &copy; 2026 FarmNexus Tech. All Rights Reserved.
      </footer>
    </div>
  )
}
