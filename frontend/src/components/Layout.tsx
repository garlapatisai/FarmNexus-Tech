import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function Layout() {
  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      <Navbar />
      <Outlet />
    </div>
  )
}
