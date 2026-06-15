import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type UserRole = 'farmer' | 'buyer' | 'admin' | null

export type Profile = {
  id: string
  phone: string | null
  name: string | null
  role: UserRole
  district: string | null
  is_suspended?: boolean
  delivery_address?: string | null
  location_lat?: number | null
  location_lng?: number | null
}

type AuthState = {
  session: Session | null
  user: User | null
  profile: Profile | null
  initialized: boolean
  isLocal: boolean  // true = session stored locally (no Supabase auth needed)
  setSession: (session: Session | null) => void
  fetchProfile: () => Promise<void>
  signOut: () => Promise<void>
  init: () => Promise<void>
  createLocalSession: (role: UserRole, opts?: { phone?: string; name?: string; district?: string }) => void
  /** @deprecated use createLocalSession */
  createDemoSession: (role: UserRole, opts?: { phone?: string; name?: string; district?: string }) => void
}

function makeLocalId() {
  return 'local-' + Math.random().toString(36).slice(2, 10)
}

function makeFakeSession(userId: string) {
  const fakeUser = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: undefined,
    phone: undefined,
    user_metadata: {},
    app_metadata: {},
    created_at: new Date().toISOString(),
  } as unknown as User

  const fakeSession = {
    access_token: 'local-token-' + userId,
    refresh_token: 'local-refresh-' + userId,
    expires_in: 999999999,
    token_type: 'bearer',
    user: fakeUser,
  } as unknown as Session

  return { fakeUser, fakeSession }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      profile: null,
      initialized: false,
      isLocal: false,

      setSession: (session) => {
        set({ session, user: session?.user ?? null })
      },

      createLocalSession: (role, opts) => {
        const id = makeLocalId()
        const phone = opts?.phone ?? null
        const name = opts?.name ?? (role === 'farmer' ? 'Demo Farmer' : role === 'buyer' ? 'Demo Buyer' : 'Demo Admin')
        const district = opts?.district ?? 'Anantapur'
        const { fakeUser, fakeSession } = makeFakeSession(id)

        const profile: Profile = {
          id,
          phone,
          name,
          role,
          district,
          is_suspended: false,
          delivery_address: role === 'buyer' ? '123 Market Road, ' + district : null,
          location_lat: 15.5,
          location_lng: 77.6,
        }

        set({ session: fakeSession, user: fakeUser, profile, initialized: true, isLocal: true })
        // Expose profile globally so FarmerListingFormPage can embed contact info in listings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__farmnexusAuthProfile = { name, phone, district }
      },

      // Alias for backward compat
      createDemoSession(...args) {
        get().createLocalSession(...args)
      },

      fetchProfile: async () => {
        if (get().isLocal) return  // Local sessions already have the profile in state
        const uid = get().user?.id
        if (!uid) { set({ profile: null }); return }
        const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
        if (error || !data) { set({ profile: null }); return }
        set({
          profile: {
            id: data.id,
            phone: data.phone ?? null,
            name: data.name ?? null,
            role: (data.role as UserRole) ?? null,
            district: data.district ?? null,
            is_suspended: Boolean((data as { is_suspended?: boolean }).is_suspended),
            delivery_address: (data as { delivery_address?: string | null }).delivery_address ?? null,
            location_lat: (data as { location_lat?: number | null }).location_lat ?? null,
            location_lng: (data as { location_lng?: number | null }).location_lng ?? null,
          },
        })
      },

      signOut: async () => {
        const { isLocal } = get()
        if (!isLocal && isSupabaseConfigured()) {
          await supabase.auth.signOut()
        }
        set({ session: null, user: null, profile: null, isLocal: false, initialized: true })
      },

      init: async () => {
        // If we have a persisted local session, just mark as initialized and use it
        if (get().isLocal && get().profile) {
          set({ initialized: true })
          return
        }

        if (!isSupabaseConfigured()) {
          set({ initialized: true })
          return
        }

        const { data } = await supabase.auth.getSession()
        set({
          session: data.session,
          user: data.session?.user ?? null,
          initialized: true,
        })
        if (data.session?.user) {
          await get().fetchProfile()
        }
        supabase.auth.onAuthStateChange(async (_event, session) => {
          // Don't override a local session
          if (get().isLocal) return
          set({ session, user: session?.user ?? null })
          if (session?.user) await get().fetchProfile()
          else set({ profile: null })
        })
      },
    }),
    {
      name: 'farmnexus-auth-v1',
      // Only persist what's needed to restore a local session
      partialize: (state) => ({
        profile: state.profile,
        isLocal: state.isLocal,
        // For local sessions, persist fake session/user so the store is consistent
        session: state.isLocal ? state.session : null,
        user: state.isLocal ? state.user : null,
      }),
    }
  )
)
