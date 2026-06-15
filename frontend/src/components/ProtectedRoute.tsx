import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)
  const profile = useAuthStore((s) => s.profile)
  const location = useLocation()

  if (!initialized) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-neutral-600">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (profile?.is_suspended) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">Account suspended</h1>
        <p className="mt-2 text-sm text-neutral-600">Contact FarmNexus Tech support if you think this is a mistake.</p>
        <button
          type="button"
          className="mt-6 text-sm font-medium text-primary underline"
          onClick={() => void useAuthStore.getState().signOut()}
        >
          Sign out
        </button>
      </div>
    )
  }

  return <>{children}</>
}
