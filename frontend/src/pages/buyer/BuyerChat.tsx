import { useSearchParams } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { OrderChatPage } from '../chat/OrderChatPage'

// Shared local listings ref to look up farmer info
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localListingsRef: Record<string, any> = (window as any).__farmnexusLocalListings ??
  ((window as any).__farmnexusLocalListings = {})

export function BuyerChat() {
  const [searchParams] = useSearchParams()
  const isLocal = useAuthStore((s) => s.isLocal)
  const user = useAuthStore((s) => s.user)
  const farmerId = searchParams.get('farmerId')

  // In local mode with a farmerId param, show a simplified contact card
  if ((isLocal || !isSupabaseConfigured()) && farmerId) {
    // Find any listing belonging to this farmer to get their info
    const farmerListing = Object.values(localListingsRef).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (l: any) => l.farmer_id === farmerId
    ) as any

    const farmerName = farmerListing?.farmer_name ?? 'Local Farmer'
    const farmerPhone = farmerListing?.farmer_phone ?? null
    const farmerDistrict = farmerListing?.farmer_district ?? 'Your Region'

    return (
      <main className="mx-auto max-w-xl px-4 py-12 text-center">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#2E7D32] text-2xl font-bold text-white shadow">
            {farmerName.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-neutral-900">{farmerName}</h1>
          <p className="mt-1 text-sm text-neutral-500">📍 {farmerDistrict}</p>

          <div className="mt-6 space-y-3">
            {farmerPhone ? (
              <>
                <p className="text-sm text-neutral-600">Contact this farmer directly:</p>
                <a
                  href={`tel:${farmerPhone}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#2E7D32] px-6 py-3 text-base font-bold text-white shadow hover:opacity-90 transition-opacity"
                >
                  📞 Call {farmerPhone}
                </a>
                <a
                  href={`https://wa.me/${farmerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-green-300 bg-green-50 px-6 py-3 text-base font-bold text-green-800 hover:bg-green-100 transition-colors"
                >
                  💬 WhatsApp Chat
                </a>
              </>
            ) : (
              <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
                <p className="font-semibold">No phone number saved</p>
                <p className="mt-1 text-xs">Ask the farmer to update their profile with a contact number.</p>
              </div>
            )}
          </div>

          <p className="mt-6 text-xs text-neutral-400">
            Signed in as: {user?.id?.slice(0, 8)}…
          </p>

          <p className="mt-3 text-xs text-neutral-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            💡 Full in-app messaging requires Supabase to be configured.
          </p>
        </div>
      </main>
    )
  }

  return <OrderChatPage role="buyer" />
}
