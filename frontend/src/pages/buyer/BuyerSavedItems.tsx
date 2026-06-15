import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatINR } from '../../lib/format'

const CAT_IMAGES: Record<string, string> = {
  vegetable: '/images/mock_veggies_1775500822956.png',
  fruit: '/images/mock_fruits_1775500805841.png',
  grain: '/images/mock_grains_1775500789644.png',
  spices: '/images/mock_spices_1775500771469.png',
  dairy: '/images/mock_veggies_1775500822956.png',
  other: '/images/mock_grains_1775500789644.png',
}

export type SavedItem = {
  id: string
  produce_name: string
  category: string
  price_per_kg: number
  quantity_kg: number
  farmer_name: string
  farmer_district: string | null
  photos: string[] | null
  saved_at: number
}

const STORAGE_KEY = 'farmnexus_saved_items'

export function getSavedItems(): SavedItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveItem(item: SavedItem) {
  const items = getSavedItems()
  if (items.some((i) => i.id === item.id)) return
  items.unshift({ ...item, saved_at: Date.now() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('farmnexus-saved-change'))
}

export function unsaveItem(id: string) {
  const items = getSavedItems().filter((i) => i.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('farmnexus-saved-change'))
}

export function isItemSaved(id: string): boolean {
  return getSavedItems().some((i) => i.id === id)
}

export function useSavedCount(): number {
  const [count, setCount] = useState(() => getSavedItems().length)
  useEffect(() => {
    const handler = () => setCount(getSavedItems().length)
    window.addEventListener('farmnexus-saved-change', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('farmnexus-saved-change', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])
  return count
}

export function BuyerSavedItems() {
  const [items, setItems] = useState<SavedItem[]>([])

  useEffect(() => {
    setItems(getSavedItems())
    const handler = () => setItems(getSavedItems())
    window.addEventListener('farmnexus-saved-change', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('farmnexus-saved-change', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  function handleRemove(id: string) {
    unsaveItem(id)
    setItems(getSavedItems())
  }

  return (
    <main className="mx-auto max-w-7xl px-4 lg:px-8 py-8 min-h-screen bg-white font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-100">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-3">
            <span className="text-red-500">♥</span> Saved Items
          </h1>
          <p className="mt-1 text-sm text-neutral-500 font-medium">
            {items.length === 0 ? 'No saved items yet' : `${items.length} item${items.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
        <Link
          to="/buyer/home"
          className="mt-4 sm:mt-0 inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm hover:bg-neutral-50 transition-colors"
        >
          ← Back to Browse
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-20 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50 text-5xl">
            ♥
          </div>
          <h2 className="text-xl font-bold text-neutral-800">No saved items yet</h2>
          <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto">
            Browse the marketplace and tap the heart icon on products you like. They'll appear here for quick access.
          </p>
          <Link
            to="/buyer/home"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2E7D32] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all"
          >
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const bgImage = item.photos?.[0] || CAT_IMAGES[item.category] || CAT_IMAGES['other']
            return (
              <div
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-md backdrop-blur transition-all hover:bg-red-50 hover:scale-110"
                  aria-label="Remove from saved"
                >
                  ♥
                </button>

                {/* Image */}
                <Link to={`/buyer/listing/${item.id}`} className="relative h-48 w-full bg-neutral-100 overflow-hidden">
                  <img src={bgImage} alt={item.produce_name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute left-3 top-3 rounded-full bg-[#2E7D32] px-3 py-1 text-xs font-bold text-white shadow-md capitalize">
                    {item.category}
                  </div>
                </Link>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5">
                  <Link to={`/buyer/listing/${item.id}`}>
                    <h2 className="text-lg font-bold text-neutral-900 hover:text-[#2E7D32] transition-colors">{item.produce_name}</h2>
                  </Link>
                  <p className="mt-1 text-sm text-neutral-500">
                    <span className="text-[#2E7D32]">◎</span> {item.farmer_district ?? 'Unknown Region'}
                  </p>

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-[#2E7D32]">{formatINR(item.price_per_kg)}</span>
                      <span className="text-sm font-semibold text-neutral-500">/kg</span>
                    </div>
                    <span className="text-sm text-neutral-500">{item.quantity_kg} kg</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">by {item.farmer_name}</span>
                    <Link
                      to={`/buyer/listing/${item.id}`}
                      className="text-xs font-semibold text-[#2E7D32] hover:underline"
                    >
                      View & Order →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
