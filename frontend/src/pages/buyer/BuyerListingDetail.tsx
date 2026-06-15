import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { formatINR } from '../../lib/format'
import { getBuyerLocation, haversineKm } from '../../lib/geo'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

// Shared in-memory store — same reference as FarmerListingFormPage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localListingsRef: Record<string, any> = (window as any).__farmnexusLocalListings ??
  ((window as any).__farmnexusLocalListings = {})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localOrdersRef: Record<string, any> = (window as any).__farmnexusLocalOrders ??
  ((window as any).__farmnexusLocalOrders = {})

type ListingState = {
  id: string
  produce_name: string
  category: string
  price_per_kg: number
  quantity_kg: number
  min_order_kg: number
  photos: string[] | null
  description: string | null
  available_from: string | null
  farmer_id: string
  location_lat: number | null
  location_lng: number | null
}

type FarmerInfo = {
  name: string
  phone: string | null
  district: string | null
}

const CAT_IMAGES: Record<string, string> = {
  vegetable: '/images/mock_veggies_1775500822956.png',
  fruit: '/images/mock_fruits_1775500805841.png',
  grain: '/images/mock_grains_1775500789644.png',
  spices: '/images/mock_spices_1775500771469.png',
  dairy: '/images/mock_veggies_1775500822956.png',
  other: '/images/mock_grains_1775500789644.png',
}

export function BuyerListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const isLocal = useAuthStore((s) => s.isLocal)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listing, setListing] = useState<ListingState | null>(null)
  const [farmer, setFarmer] = useState<FarmerInfo>({ name: 'Farmer', phone: null, district: null })
  const [qty, setQty] = useState(1)
  const [address, setAddress] = useState('')
  const [slide, setSlide] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState(false)
  const [orderedQty, setOrderedQty] = useState(0)
  const [orderedTotal, setOrderedTotal] = useState(0)
  const [buyerPos, setBuyerPos] = useState<{ lat: number; lng: number } | null>(null)

  // Leaflet does not require an API key to load.

  useEffect(() => {
    void (async () => {
      const loc = await getBuyerLocation()
      if (loc) setBuyerPos(loc)
    })()
  }, [])

  useEffect(() => {
    setAddress(profile?.delivery_address ?? '')
  }, [profile?.delivery_address])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      setLoading(true)

      // ── Local / isLocal mode: read from the shared in-memory store ──────────
      if (isLocal || !isSupabaseConfigured()) {
        if (cancelled) return
        const local = localListingsRef[id]
        if (!local || !local.is_active || Number(local.quantity_kg) <= 0) {
          setError('Listing not found or sold out')
          setListing(null)
          setLoading(false)
          return
        }
        setListing({
          id: local.id,
          produce_name: local.produce_name,
          category: local.category ?? 'other',
          price_per_kg: Number(local.price_per_kg),
          quantity_kg: Number(local.quantity_kg),
          min_order_kg: Number(local.min_order_kg),
          photos: local.photos as string[] | null,
          description: local.description ?? null,
          available_from: local.available_from ?? null,
          farmer_id: local.farmer_id,
          // Provide fallback coordinates for local demo mode if none exist (Anantapur coordinates)
          location_lat: local.location_lat != null ? Number(local.location_lat) : 14.6819,
          location_lng: local.location_lng != null ? Number(local.location_lng) : 77.6006,
        })
        setFarmer({
          name: local.farmer_name ?? 'Local Farmer',
          phone: local.farmer_phone ?? null,
          district: local.farmer_district ?? 'Your Region',
        })
        setQty(Number(local.min_order_kg))
        setError(null)
        setLoading(false)
        return
      }

      // ── Supabase mode ────────────────────────────────────────────────────────
      try {
        const { data: l, error: le } = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .eq('is_active', true)
          .gt('quantity_kg', 0)
          .maybeSingle()
        if (cancelled) return
        if (le || !l) {
          setError(le?.message ?? 'Listing not found')
          setListing(null)
          setLoading(false)
          return
        }
        const { data: f } = await supabase.from('profiles').select('name, district, phone, location_lat, location_lng').eq('id', l.farmer_id).maybeSingle()
        if (cancelled) return
        setListing({
          id: l.id,
          produce_name: l.produce_name,
          category: l.category ?? 'other',
          price_per_kg: Number(l.price_per_kg),
          quantity_kg: Number(l.quantity_kg),
          min_order_kg: Number(l.min_order_kg),
          photos: l.photos as string[] | null,
          description: l.description,
          available_from: l.available_from,
          farmer_id: l.farmer_id,
          location_lat: l.location_lat ?? f?.location_lat ?? null,
          location_lng: l.location_lng ?? f?.location_lng ?? null,
        })
        setFarmer({
          name: f?.name ?? 'Farmer',
          phone: (f as any)?.phone ?? null,
          district: f?.district ?? null,
        })
        setQty(Number(l.min_order_kg))
        setError(null)
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError('Could not load product. Please try again.')
          setLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [id, isLocal])

  const maxQty = listing?.quantity_kg ?? 0
  const minQty = listing?.min_order_kg ?? 1

  const distanceKm = useMemo(() => {
    if (!buyerPos || !listing?.location_lat || !listing?.location_lng) return null
    return haversineKm(buyerPos.lat, buyerPos.lng, listing.location_lat, listing.location_lng)
  }, [buyerPos, listing])

  const total = useMemo(() => {
    if (!listing) return 0
    return Math.round(qty * listing.price_per_kg * 100) / 100
  }, [listing, qty])

  async function placeOrder() {
    if (!listing || !user?.id) return
    if (listing.quantity_kg <= 0) { setError('This product is sold out.'); return }
    if (qty < minQty || qty > maxQty) { setError(`Quantity must be between ${minQty} and ${maxQty} kg`); return }
    if (!address.trim()) { setError('Enter delivery address'); return }
    setSubmitting(true)
    setError(null)

    // ── Local mode ───────────────────────────────────────────────────────────
    if (isLocal || !isSupabaseConfigured()) {
      const local = localListingsRef[listing.id]
      if (!local) { setSubmitting(false); setError('Product no longer available.'); return }
      const latestQty = Number(local.quantity_kg)
      if (latestQty < qty) { setSubmitting(false); setError(`Only ${latestQty} kg available. Please reduce quantity.`); return }
      const newQty = latestQty - qty
      localListingsRef[listing.id] = { ...local, quantity_kg: newQty, is_active: newQty > 0 }
      
      const orderId = 'local-' + Date.now()
      localOrdersRef[orderId] = {
        id: orderId,
        listing_id: listing.id,
        buyer_id: user.id,
        farmer_id: listing.farmer_id,
        quantity_kg: qty,
        total_amount: total,
        delivery_address: address.trim(),
        status: 'placed',
        payment_status: 'pending',
        created_at: new Date().toISOString()
      }

      setOrderedQty(qty)
      setOrderedTotal(total)
      setSubmitting(false)
      setOrderConfirmed(true)
      return
    }

    // ── Supabase mode ────────────────────────────────────────────────────────
    const { data: freshListing, error: fle } = await supabase
      .from('listings').select('quantity_kg, is_active').eq('id', listing.id).eq('is_active', true).maybeSingle()
    if (fle || !freshListing) { setSubmitting(false); setError('Product no longer available.'); return }
    const latestQty = Number(freshListing.quantity_kg)
    if (latestQty < qty) { setSubmitting(false); setError(`Only ${latestQty} kg available. Please reduce quantity.`); return }

    const { data, error: oe } = await supabase.from('orders').insert({
      listing_id: listing.id, buyer_id: user.id, farmer_id: listing.farmer_id,
      quantity_kg: qty, total_amount: total, delivery_address: address.trim(),
      status: 'placed', payment_status: 'pending',
    }).select('id').single()

    if (oe) { setSubmitting(false); setError(oe.message); return }

    const newQty = latestQty - qty
    await supabase.from('listings').update({ quantity_kg: newQty, ...(newQty <= 0 ? { is_active: false, quantity_kg: 0 } : {}) }).eq('id', listing.id)
    setSubmitting(false)
    navigate(`/buyer/cart?orderId=${data.id}`)
  }

  // ── Order Confirmed Overlay ──────────────────────────────────────────────
  if (orderConfirmed && listing) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-10 shadow-lg">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-5xl">✅</div>
          <h1 className="text-3xl font-extrabold text-emerald-800">Order Confirmed!</h1>
          <p className="mt-2 text-neutral-600">Your order has been placed successfully.</p>

          <div className="mt-6 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white text-left shadow-sm">
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-neutral-500">Product</span>
              <span className="font-semibold">{listing.produce_name}</span>
            </div>
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-neutral-500">Quantity</span>
              <span className="font-semibold">{orderedQty} kg</span>
            </div>
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-neutral-500">Total</span>
              <span className="font-semibold text-emerald-700">{formatINR(orderedTotal)}</span>
            </div>
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-neutral-500">Farmer</span>
              <span className="font-semibold">{farmer.name}</span>
            </div>
            {farmer.phone && (
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-neutral-500">Contact</span>
                <a href={`tel:${farmer.phone}`} className="font-semibold text-primary hover:underline">{farmer.phone}</a>
              </div>
            )}
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-neutral-500">Delivery to</span>
              <span className="max-w-[60%] text-right font-medium">{address}</span>
            </div>
          </div>

          <p className="mt-5 text-sm text-neutral-500">The farmer will confirm your order shortly and get in touch.</p>

          <div className="mt-6 flex gap-3 justify-center">
            <Link to="/buyer/home" className="rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
              Continue Shopping
            </Link>
            <Link
              to={`/buyer/chat?farmerId=${listing.farmer_id}`}
              className="rounded-lg bg-[#2E7D32] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              💬 Chat with Farmer
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mt-12 flex flex-col items-center gap-3 text-neutral-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm">Loading product…</p>
        </div>
      </main>
    )
  }

  if (!listing) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-red-600">{error ?? 'Not found'}</p>
        <Link to="/buyer/home" className="mt-4 inline-block text-primary underline">Back to browse</Link>
      </main>
    )
  }

  const photos = listing.photos?.length ? listing.photos : []
  const fallbackImg = CAT_IMAGES[listing.category] ?? CAT_IMAGES['other']

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/buyer/home" className="inline-flex items-center gap-1 text-sm font-medium text-[#2E7D32] hover:underline">
        ← Back to marketplace
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* === Left: Photo carousel === */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 shadow-sm">
            <img
              src={photos.length ? photos[slide % photos.length] : fallbackImg}
              alt={listing.produce_name}
              className="h-full w-full object-cover"
            />
            {/* Category pill */}
            <span className="absolute left-3 top-3 rounded-full bg-[#2E7D32] px-3 py-1 text-xs font-bold capitalize text-white shadow">
              {listing.category}
            </span>
            {/* Stock pill */}
            <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow ${listing.quantity_kg < 10 ? 'bg-amber-500 text-white' : 'bg-white/90 text-neutral-800'}`}>
              {listing.quantity_kg < 10 ? `⚠ ${listing.quantity_kg} kg left` : `${listing.quantity_kg} kg`}
            </span>
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                {photos.map((_, i) => (
                  <button key={i} type="button" aria-label={`Photo ${i + 1}`}
                    className={`h-2 w-2 rounded-full transition-all ${i === slide ? 'bg-white scale-125' : 'bg-white/50'}`}
                    onClick={() => setSlide(i)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* === Right: Details === */}
        <div className="flex flex-col gap-5">
          {/* Product title & price */}
          <div>
            <h1 className="text-3xl font-extrabold text-neutral-900">{listing.produce_name}</h1>
            <p className="mt-1 text-sm text-neutral-500 capitalize">{listing.category}{listing.available_from ? ` · Available from ${listing.available_from}` : ''}</p>
            <p className="mt-3 text-4xl font-extrabold text-[#2E7D32]">
              {formatINR(listing.price_per_kg)}
              <span className="text-lg font-normal text-neutral-500">/kg</span>
            </p>
            {listing.description && <p className="mt-3 text-sm leading-relaxed text-neutral-600">{listing.description}</p>}
          </div>

          {/* Farmer info card */}
          <div className="rounded-xl border border-neutral-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Seller Details</p>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2E7D32] text-lg font-bold text-white shadow">
                {farmer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-neutral-900">{farmer.name}</p>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>📍 {farmer.district}</span>
                  {distanceKm != null && <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-semibold">({distanceKm.toFixed(1)} km away)</span>}
                </div>
              </div>
            </div>

            {listing.location_lat && listing.location_lng && (
              <div className="mt-4 h-48 w-full overflow-hidden rounded-lg border border-emerald-100 shadow-inner">
                  <MapContainer
                    center={[listing.location_lat, listing.location_lng]}
                    zoom={10}
                    style={{ width: '100%', height: '100%', zIndex: 1 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[listing.location_lat, listing.location_lng]}>
                      <Popup>{farmer.name}</Popup>
                    </Marker>
                    {buyerPos && (
                      <Marker position={[buyerPos.lat, buyerPos.lng]}>
                        <Popup>Your Location</Popup>
                      </Marker>
                    )}
                  </MapContainer>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {farmer.phone && (
                <a
                  href={`tel:${farmer.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 transition-colors"
                >
                  📞 {farmer.phone}
                </a>
              )}
              <Link
                to={`/buyer/chat?farmerId=${listing.farmer_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2E7D32] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                💬 Chat with Farmer
              </Link>
            </div>
          </div>

          {/* Order form */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <p className="font-bold text-neutral-800">Place Your Order</p>

            <label className="block text-sm font-medium text-neutral-700">
              Quantity (kg)
              <input
                type="number"
                step="0.1"
                min={minQty}
                max={maxQty}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#2E7D32] focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
              <span className="mt-1 block text-xs text-neutral-400">Min {minQty} kg · Max {maxQty} kg available</span>
            </label>

            <label className="block text-sm font-medium text-neutral-700">
              Delivery Address
              <textarea
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#2E7D32] focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
                rows={3}
                placeholder="Enter your full delivery address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>

            <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2">
              <span className="text-sm text-neutral-600">Estimated Total</span>
              <span className="text-lg font-extrabold text-[#2E7D32]">{formatINR(total)}</span>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                ⚠ {error}
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={() => void placeOrder()}
              className="w-full rounded-xl bg-[#2E7D32] py-3.5 text-base font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Placing Order…
                </span>
              ) : (
                '✓ Confirm Order'
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
