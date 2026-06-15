import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { cn } from '../lib/utils'
import { useSavedCount } from '../pages/buyer/BuyerSavedItems'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
    isActive ? 'bg-[#F0F4F8] text-[#333F4D]' : 'text-neutral-500 hover:bg-[#F0F4F8] hover:text-[#333F4D]',
  )

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const role = profile?.role
  const savedCount = useSavedCount()

  const farmerLinks = (
    <>
      <NavLink to="/farmer/dashboard" className={linkClass} onClick={() => setOpen(false)}>
        Dashboard
      </NavLink>
      <NavLink to="/farmer/analytics" className={linkClass} onClick={() => setOpen(false)}>
        Analytics
      </NavLink>
      <NavLink to="/farmer/listings" className={linkClass} onClick={() => setOpen(false)}>
        Marketplace
      </NavLink>
      <NavLink to="/farmer/orders" className={linkClass} onClick={() => setOpen(false)}>
        Orders
      </NavLink>
      <NavLink to="/farmer/chat" className={linkClass} onClick={() => setOpen(false)}>
        Chat
      </NavLink>
    </>
  )

  const buyerLinks = (
    <>
      <NavLink to="/buyer/home" className={linkClass} onClick={() => setOpen(false)}>
        Browse
      </NavLink>
      <NavLink to="/buyer/orders" className={linkClass} onClick={() => setOpen(false)}>
        Orders
      </NavLink>
      <NavLink to="/buyer/saved" className={linkClass} onClick={() => setOpen(false)}>
        Saved {savedCount > 0 && <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">{savedCount}</span>}
      </NavLink>
      <NavLink to="/buyer/chat" className={linkClass} onClick={() => setOpen(false)}>
        Chat
      </NavLink>
    </>
  )

  const adminLinks = (
    <>
      <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
        Dashboard
      </NavLink>
      <NavLink to="/admin/users" className={linkClass} onClick={() => setOpen(false)}>
        Users
      </NavLink>
      <NavLink to="/admin/orders" className={linkClass} onClick={() => setOpen(false)}>
        Orders
      </NavLink>
    </>
  )

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-b border-neutral-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 lg:px-8 py-3">
        <Link to="/" className="flex flex-col tracking-tight" onClick={() => setOpen(false)}>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2E7D32]/10 text-xl" aria-hidden>
              🌾
            </span>
            <span className="text-xl font-extrabold text-[#2E7D32]">
              FarmNexus<span className="text-[#F57C00] font-medium text-sm ml-1">TECH</span>
            </span>
          </div>
        </Link>

        {/* Centered navigation links */}
        <nav className="hidden items-center gap-2 md:flex absolute left-1/2 -translate-x-1/2">
           {session && role === 'farmer' && farmerLinks}
           {session && role === 'buyer' && buyerLinks}
           {session && role === 'admin' && adminLinks}
        </nav>

        {/* Right side buttons */}
        <nav className="hidden items-center gap-3 md:flex">
          {!session && (
            <>
              <NavLink to="/register" className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
                Sign Up
              </NavLink>
              <NavLink to="/login" className="rounded-full bg-[#2E7D32] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1b4b1e] transition-colors shadow-sm">
                Log In
              </NavLink>
            </>
          )}
          {session && (
            <div className="flex items-center gap-4 relative">
              <button
                type="button"
                className="hidden lg:flex w-8 h-8 rounded-full bg-[#E8F0FE] text-[#1967D2] items-center justify-center font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#1967D2] hover:bg-[#D2E3FC] transition-colors cursor-pointer"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                {profile?.name?.charAt(0) || 'U'}
              </button>

              {profileOpen && (
                <div className="absolute right-12 top-12 w-64 bg-white rounded-xl shadow-lg border border-neutral-100 p-4 flex flex-col gap-3 z-50">
                  <div className="flex flex-col border-b border-neutral-100 pb-3">
                    <span className="font-semibold text-neutral-800">{profile?.name || 'User'}</span>
                    <span className="text-xs text-neutral-500 capitalize">{profile?.role || 'Guest'}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-neutral-600">
                    {profile?.phone && <div><span className="font-medium text-neutral-700">Phone:</span> {profile.phone}</div>}
                    {profile?.district && <div><span className="font-medium text-neutral-700">District:</span> {profile.district}</div>}
                    {profile?.delivery_address && <div><span className="font-medium text-neutral-700">Address:</span> {profile.delivery_address}</div>}
                  </div>
                </div>
              )}

              <button
                type="button"
                className="rounded-full bg-[#2E7D32] px-5 py-2 text-sm font-semibold text-white hover:bg-[#205723] transition-colors shadow-sm"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className="inline-flex rounded-full bg-[#F0F4F8] p-2 text-neutral-600 md:hidden"
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-xl leading-none">☰</span>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="flex flex-col gap-2 border-t border-neutral-100 bg-white px-4 py-4 md:hidden shadow-inner">
          {session && role === 'farmer' && farmerLinks}
          {session && role === 'buyer' && buyerLinks}
          {session && role === 'admin' && adminLinks}
          <div className="my-2 border-t border-neutral-100"></div>
          {!session && (
            <div className="flex gap-2">
              <NavLink to="/register" className="flex-1 text-center rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-600" onClick={() => setOpen(false)}>
                Sign Up
              </NavLink>
              <NavLink to="/login" className="flex-1 text-center rounded-full bg-[#2E7D32] px-5 py-2 text-sm font-semibold text-white" onClick={() => setOpen(false)}>
                Log In
              </NavLink>
            </div>
          )}
          {session && (
            <button
              type="button"
              className="rounded-full bg-[#2E7D32] px-5 py-2 text-sm font-semibold text-white w-full text-center"
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </header>
  )
}
