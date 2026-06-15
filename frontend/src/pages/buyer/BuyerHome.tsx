import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { formatINR } from '../../lib/format'
import { getBuyerLocation, haversineKm } from '../../lib/geo'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { parseSearchQuery, type ParsedSearchFilters } from '../../services/gemini'
import { isItemSaved, saveItem, unsaveItem } from './BuyerSavedItems'

// Shared in-memory store — same reference as FarmerListingFormPage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localListingsRef: Record<string, any> = (window as any).__farmnexusLocalListings ??
  ((window as any).__farmnexusLocalListings = {})

type Category = 'all' | 'vegetable' | 'fruit' | 'grain' | 'dairy' | 'other' | 'spices'

type ListingCard = {
  id: string
  produce_name: string
  category: string
  price_per_kg: number
  quantity_kg: number
  min_order_kg: number
  photos: string[] | null
  available_from: string | null
  location_lat: number | null
  location_lng: number | null
  farmer_id: string
  farmer_name: string
  farmer_district: string | null
  distance_km: number | null
}

const CAT_IMAGES: Record<string, string> = {
  vegetable: '/images/mock_veggies_1775500822956.png',
  fruit: '/images/mock_fruits_1775500805841.png',
  grain: '/images/mock_grains_1775500789644.png',
  spices: '/images/mock_spices_1775500771469.png',
  dairy: '/images/mock_veggies_1775500822956.png', // Fallback
  other: '/images/mock_grains_1775500789644.png' // Fallback
}

export function BuyerHome() {
  const profile = useAuthStore((s) => s.profile)
  const isLocal = useAuthStore((s) => s.isLocal)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [buyerPos, setBuyerPos] = useState<{ lat: number; lng: number } | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  
  const [rows, setRows] = useState<ListingCard[]>([])
  const [loading, setLoading] = useState(true)

  // AI Smart Search state
  const [aiFilters, setAiFilters] = useState<ParsedSearchFilters | null>(null)
  const [aiSearchLoading, setAiSearchLoading] = useState(false)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Leaflet does not require an API key to load.

  useEffect(() => {
    void (async () => {
      const loc = await getBuyerLocation()
      if (loc) setBuyerPos(loc)
    })()
  }, [])

  // Trigger AI parsing when query looks like natural language (length > 12)
  useEffect(() => {
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    const q = search.trim()
    if (q.length <= 12) {
      setAiFilters(null)
      return
    }
    aiDebounceRef.current = setTimeout(async () => {
      setAiSearchLoading(true)
      try {
        const filters = await parseSearchQuery(q)
        setAiFilters(Object.keys(filters).length > 0 ? filters : null)
      } catch {
        setAiFilters(null)
      } finally {
        setAiSearchLoading(false)
      }
    }, 700)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)

    // ── Local / demo mode: read from the shared in-memory store ──────────────
    if (isLocal || !isSupabaseConfigured()) {
      const localItems = Object.values(localListingsRef) as any[]
      const activeLocal = localItems.filter((l) => l.is_active && Number(l.quantity_kg) > 0)

      if (activeLocal.length > 0) {
        setRows(
          activeLocal.map((l) => ({
            id: l.id,
            produce_name: l.produce_name,
            category: l.category,
            price_per_kg: Number(l.price_per_kg),
            quantity_kg: Number(l.quantity_kg),
            min_order_kg: Number(l.min_order_kg),
            photos: (l.photos as string[] | null),
            available_from: l.available_from ?? null,
            location_lat: null,
            location_lng: null,
            farmer_id: l.farmer_id,
            farmer_name: 'Local Farmer',
            farmer_district: 'Your Region',
            distance_km: null,
          }))
        )
      } else {
        // No local listings yet — show demo data so the UI isn't empty
        setRows([
          { id: '1', produce_name: 'Green Cardamom', category: 'spices', price_per_kg: 1800, quantity_kg: 50, min_order_kg: 1, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'x', farmer_name: 'Meena Krishnan', farmer_district: 'Idukki, Kerala', distance_km: null },
          { id: '2', produce_name: 'Wheat Flour', category: 'grain', price_per_kg: 40, quantity_kg: 1500, min_order_kg: 10, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'x', farmer_name: 'Ramesh Yadav', farmer_district: 'Indore, Madhya Pradesh', distance_km: null },
          { id: '3', produce_name: 'Alphonso Mangoes', category: 'fruit', price_per_kg: 450, quantity_kg: 300, min_order_kg: 5, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'x', farmer_name: 'Anil Patil', farmer_district: 'Ratnagiri, Maharashtra', distance_km: null },
          { id: '4', produce_name: 'Fresh Vegetables', category: 'vegetable', price_per_kg: 40, quantity_kg: 500, min_order_kg: 2, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'x', farmer_name: 'Sonia Farms', farmer_district: 'Nashik, Maharashtra', distance_km: null },
        ])
      }
      setLoading(false)
      return
    }

    // ── Supabase mode ─────────────────────────────────────────────────────────
    const { data: listings } = await supabase
      .from('listings')
      .select('id, produce_name, category, price_per_kg, quantity_kg, min_order_kg, photos, available_from, location_lat, location_lng, farmer_id')
      .eq('is_active', true)
      .gt('quantity_kg', 0)

    const farmerIds = [...new Set((listings ?? []).map((l) => l.farmer_id))]
    let farmers: any[] = []
    if (farmerIds.length) {
      const { data: fdata } = await supabase.from('profiles').select('id, name, district, location_lat, location_lng').in('id', farmerIds)
      farmers = fdata ?? []
    }
    const fmap = Object.fromEntries(farmers.map((f) => [f.id, f]))

    const origin =
      buyerPos ??
      (profile?.location_lat != null && profile?.location_lng != null
        ? { lat: Number(profile.location_lat), lng: Number(profile.location_lng) }
        : null)

    const enriched: ListingCard[] = (listings ?? []).map((l) => {
      const f = fmap[l.farmer_id]
      const flat = l.location_lat != null ? Number(l.location_lat) : f?.location_lat != null ? Number(f.location_lat) : null
      const flng = l.location_lng != null ? Number(l.location_lng) : f?.location_lng != null ? Number(f.location_lng) : null
      let distance_km = null
      if (origin && flat != null && flng != null) {
        distance_km = haversineKm(origin.lat, origin.lng, flat, flng)
      }
      return {
        id: l.id,
        produce_name: l.produce_name,
        category: l.category,
        price_per_kg: Number(l.price_per_kg),
        quantity_kg: Number(l.quantity_kg),
        min_order_kg: Number(l.min_order_kg),
        photos: l.photos as string[] | null,
        available_from: l.available_from,
        location_lat: flat,
        location_lng: flng,
        farmer_id: l.farmer_id,
        farmer_name: f?.name ?? 'Farmer',
        farmer_district: f?.district ?? 'Unknown Region',
        distance_km,
      }
    })

    if (enriched.length === 0) {
      setRows([
        { id: '1', produce_name: 'Green Cardamom', category: 'spices', price_per_kg: 1800, quantity_kg: 50, min_order_kg: 1, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'x', farmer_name: 'Meena Krishnan', farmer_district: 'Idukki, Kerala', distance_km: null },
        { id: '2', produce_name: 'Wheat Flour', category: 'grain', price_per_kg: 40, quantity_kg: 1500, min_order_kg: 10, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'x', farmer_name: 'Ramesh Yadav', farmer_district: 'Indore, Madhya Pradesh', distance_km: null },
        { id: '3', produce_name: 'Alphonso Mangoes', category: 'fruit', price_per_kg: 450, quantity_kg: 300, min_order_kg: 5, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'x', farmer_name: 'Anil Patil', farmer_district: 'Ratnagiri, Maharashtra', distance_km: null },
        { id: '4', produce_name: 'Fresh Vegetables', category: 'vegetable', price_per_kg: 40, quantity_kg: 500, min_order_kg: 2, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'x', farmer_name: 'Sonia Farms', farmer_district: 'Nashik, Maharashtra', distance_km: null },
      ])
    } else {
      setRows(enriched)
    }
    setLoading(false)
  }, [buyerPos, profile, isLocal])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    let r = rows
    // Apply manual category filter
    if (category !== 'all') r = r.filter((x) => x.category === category)
    const q = search.trim().toLowerCase()
    if (q) r = r.filter((x) => x.produce_name.toLowerCase().includes(q))
    // Apply AI-parsed filters on top (when AI Smart Search is active)
    if (aiFilters) {
      if (aiFilters.category && category === 'all') {
        r = r.filter((x) => x.category === aiFilters.category)
      }
      if (aiFilters.maxPrice) {
        r = r.filter((x) => x.price_per_kg <= aiFilters.maxPrice!)
      }
      if (aiFilters.keywords) {
        const kw = aiFilters.keywords.toLowerCase()
        r = r.filter((x) => x.produce_name.toLowerCase().includes(kw) || x.farmer_district?.toLowerCase().includes(kw))
      }
    }
    return [...r].sort((a, b) => a.price_per_kg - b.price_per_kg)
  }, [rows, category, search, aiFilters])

  return (
    <main className="mx-auto max-w-7xl px-4 lg:px-8 py-8 min-h-screen bg-white font-sans">
      
      {/* Header spanning exactly like mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-100">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Marketplace</h1>
          <p className="mt-1 text-sm text-neutral-500 font-medium">Browse fresh produce directly from farmers</p>
        </div>
        
        {/* Toggle Grid / Map */}
        <div className="mt-4 sm:mt-0 flex items-center bg-[#F0F4F8] p-1 rounded-lg">
          <button 
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${viewMode === 'grid' ? 'bg-[#2E7D32] text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <span>⊞</span> Grid
          </button>
          <button 
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${viewMode === 'map' ? 'bg-[#2E7D32] text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <span>🗺</span> Map
          </button>
        </div>
      </div>

      {/* Main Search Bar & Filter */}
      <div className="mt-6 flex items-center rounded-xl border border-neutral-200 bg-white p-2 shadow-sm max-w-full">
         <span className="pl-3 pr-2 text-neutral-400 font-bold">🔍</span>
         <input
           type="search"
           placeholder="Search products, farmers, or describe what you need…"
           className="w-full bg-transparent px-2 py-2 text-sm text-neutral-700 outline-none"
           value={search}
           onChange={(e) => setSearch(e.target.value)}
         />
         {aiSearchLoading && (
           <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
         )}
         <div className="border-l border-neutral-200 pl-2 pr-2 hidden sm:flex">
            <select 
               className="bg-transparent text-sm font-medium text-neutral-600 outline-none pr-4 appearance-none cursor-pointer"
               value={category}
               onChange={(e) => setCategory(e.target.value as Category)}
            >
               <option value="all">☷ All</option>
               <option value="spices">Spices</option>
               <option value="grain">Grains</option>
               <option value="fruit">Fruits</option>
               <option value="vegetable">Vegetables</option>
               <option value="dairy">Dairy</option>
            </select>
         </div>
      </div>

      {/* AI Filter Pill */}
      {aiFilters && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            🧠 AI Filtered
          </span>
          {aiFilters.category && (
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">Category: {aiFilters.category}</span>
          )}
          {aiFilters.maxPrice && (
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">Under {formatINR(aiFilters.maxPrice)}/kg</span>
          )}
          {aiFilters.keywords && (
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">"{aiFilters.keywords}"</span>
          )}
          <button
            type="button"
            onClick={() => { setAiFilters(null); setSearch('') }}
            className="text-xs text-neutral-400 hover:text-neutral-600 underline transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Views */}
      {viewMode === 'map' ? (
        <div className="mt-8 h-[600px] rounded-2xl bg-neutral-100 flex flex-col items-center justify-center border border-neutral-200 overflow-hidden">
             <MapContainer
               center={buyerPos || { lat: 20.5937, lng: 78.9629 }}
               zoom={buyerPos ? 10 : 5}
               style={{ width: '100%', height: '100%', zIndex: 1 }}
             >
               <TileLayer
                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
               />
               {buyerPos && (
                 <Marker position={[buyerPos.lat, buyerPos.lng]}>
                   <Popup>Your Location</Popup>
                 </Marker>
               )}
               {filtered.map(l => (
                 l.location_lat && l.location_lng ? (
                   <Marker 
                     key={`marker-${l.id}`}
                     position={[l.location_lat, l.location_lng]}
                   >
                     <Popup>{`${l.farmer_name} - ${l.produce_name}`}</Popup>
                   </Marker>
                 ) : null
               ))}
             </MapContainer>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse h-80 rounded-2xl border border-neutral-200 bg-neutral-50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="mt-16 text-center text-neutral-500 font-medium">No results found mapping your search.</p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((l) => {
                const bgImage = l.photos?.[0] || CAT_IMAGES[l.category] || CAT_IMAGES['other']
                return (
                  <div
                    key={l.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* Save Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (isItemSaved(l.id)) {
                          unsaveItem(l.id);
                        } else {
                          saveItem({
                            id: l.id,
                            produce_name: l.produce_name,
                            category: l.category,
                            price_per_kg: l.price_per_kg,
                            quantity_kg: l.quantity_kg,
                            farmer_name: l.farmer_name,
                            farmer_district: l.farmer_district,
                            photos: l.photos,
                            saved_at: Date.now()
                          });
                        }
                        // Force a re-render to update the heart icon
                        setSearch(search);
                      }}
                      className={`absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full shadow-md backdrop-blur transition-all hover:scale-110 ${
                        isItemSaved(l.id) ? 'bg-white/90 text-red-500' : 'bg-white/50 text-neutral-500 hover:bg-white/90 hover:text-red-500'
                      }`}
                      aria-label={isItemSaved(l.id) ? "Remove from saved" : "Save item"}
                    >
                      ♥
                    </button>

                    <Link to={`/buyer/listing/${l.id}`} className="contents">
                      {/* Top Image Region */}
                      <div className="relative h-56 w-full bg-neutral-100 overflow-hidden">
                        <img src={bgImage} alt={l.produce_name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      
                      {/* Left Category Badge */}
                      <div className="absolute left-3 top-3 rounded-full bg-[#2E7D32] px-3 py-1 text-xs font-bold text-white shadow-md capitalize tracking-wide">
                        {l.category}
                      </div>

                      {/* Right AI Price Suggestion Badge */}
                      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F57C00] to-[#E65100] px-3 py-1 text-xs font-bold text-white shadow-md">
                        <span className="text-[10px]">~AI:</span> {formatINR(l.price_per_kg)}/kg
                      </div>
                    </div>

                    {/* Content Region */}
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="text-xl font-bold text-neutral-900">{l.produce_name}</h2>
                      <div className="mt-1 flex items-center justify-between text-sm font-medium text-neutral-500">
                        <div className="flex items-center">
                          <span className="mr-1 text-red-500">📍</span> {l.farmer_district}
                          {l.distance_km != null && (
                            <span className="ml-1 text-xs opacity-75">({l.distance_km.toFixed(1)} km)</span>
                          )}
                        </div>
                        {l.location_lat && l.location_lng && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              setViewMode('map')
                            }}
                            className="text-xs font-semibold text-[#2E7D32] hover:underline"
                          >
                            View on map
                          </button>
                        )}
                      </div>
                      
                      <div className="mt-4 flex items-end justify-between border-b border-neutral-100 pb-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-[#2E7D32]">{formatINR(l.price_per_kg)}</span>
                          <span className="text-sm font-semibold text-neutral-500">/kg</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-medium text-neutral-600">{l.quantity_kg} kg available</span>
                          {l.quantity_kg < 10 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">⚠ Low Stock</span>
                          )}
                        </div>
                      </div>

                      <p className="mt-4 text-xs font-medium text-neutral-400">
                        by <span className="text-neutral-700">{l.farmer_name}</span>
                      </p>
                    </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </main>
  )
}
