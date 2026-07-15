import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function Layout() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pt-[70px]">
      <Navbar />
      <Outlet />
    </div>
  )
}
