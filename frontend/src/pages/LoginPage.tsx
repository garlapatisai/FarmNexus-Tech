import { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, type UserRole } from '../store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const profile = useAuthStore((s) => s.profile)
  const createLocalSession = useAuthStore((s) => s.createLocalSession)

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!profile?.role) return
    if (profile.role === 'farmer') navigate(from?.startsWith('/farmer') ? from : '/farmer/dashboard', { replace: true })
    else if (profile.role === 'buyer') navigate(from?.startsWith('/buyer') ? from : '/buyer/home', { replace: true })
    else if (profile.role === 'admin') navigate('/admin', { replace: true })
  }, [profile, navigate, from])

  function handleQuickLogin(role: UserRole) {
    createLocalSession(role)
    if (role === 'farmer') navigate(from?.startsWith('/farmer') ? from : '/farmer/dashboard', { replace: true })
    else if (role === 'buyer') navigate(from?.startsWith('/buyer') ? from : '/buyer/home', { replace: true })
    else if (role === 'admin') navigate('/admin', { replace: true })
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Your session is saved on this device — you should be redirected automatically.
      </p>

      <div className="mt-8 space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-neutral-700">Quick access</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="w-full rounded-lg bg-primary py-2.5 font-semibold text-white hover:opacity-95"
            onClick={() => handleQuickLogin('farmer')}
          >
            🌾 Continue as Farmer
          </button>
          <button
            type="button"
            className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white hover:opacity-95"
            onClick={() => handleQuickLogin('buyer')}
          >
            🛒 Continue as Buyer
          </button>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <Link
            to="/register"
            className="block w-full rounded-lg border-2 border-neutral-200 py-2.5 text-center font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Create a new account →
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Admin?{' '}
        <Link to="/admin/login" className="font-medium text-neutral-700 hover:underline">
          Admin login
        </Link>
      </p>
    </main>
  )
}
