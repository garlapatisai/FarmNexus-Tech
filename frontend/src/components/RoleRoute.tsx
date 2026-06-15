import { Navigate } from 'react-router-dom'
import { useAuthStore, type UserRole } from '../store/authStore'

export function RoleRoute({
  role,
  children,
}: {
  role: Exclude<UserRole, null>
  children: React.ReactNode
}) {
  const profile = useAuthStore((s) => s.profile)
  const initialized = useAuthStore((s) => s.initialized)

  if (!initialized) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-neutral-600">
        Loading…
      </div>
    )
  }

  // Correct role — render children
  if (profile?.role === role) {
    return <>{children}</>
  }

  // Has a different role — redirect to their dashboard
  if (profile?.role === 'farmer') return <Navigate to="/farmer/dashboard" replace />
  if (profile?.role === 'buyer') return <Navigate to="/buyer/home" replace />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />

  // No profile yet — send to register
  return <Navigate to="/register" replace />
}
