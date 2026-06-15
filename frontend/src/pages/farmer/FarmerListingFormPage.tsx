import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { listingFormSchema, type ListingFormValues } from '../../lib/schemas'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { suggestCropPrice, type PriceSuggestion } from '../../services/gemini'

// In-memory store for listings created in local-session mode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localListings: Record<string, any> = (window as any).__farmnexusLocalListings ??
  ((window as any).__farmnexusLocalListings = {})


const BUCKET = 'produce-photos'

export function FarmerListingFormPage() {
  const { id: editId } = useParams<{ id: string }>()
  const isEdit = Boolean(editId)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isLocal = useAuthStore((s) => s.isLocal)
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loadingListing, setLoadingListing] = useState(isEdit)

  // AI Price Advisor state
  const [aiPriceLoading, setAiPriceLoading] = useState(false)
  const [aiPriceSuggestion, setAiPriceSuggestion] = useState<PriceSuggestion | null>(null)
  const [aiPriceError, setAiPriceError] = useState<string | null>(null)
  const produceNameRef = useRef<string>('')
  const categoryRef = useRef<string>('vegetable')
  const quantityRef = useRef<number>(0)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      category: 'vegetable',
      min_order_kg: 1,
    },
  })

  // Keep refs in sync for AI button (avoids stale closure)
  const watchedProduceName = watch('produce_name')
  const watchedCategory = watch('category')
  const watchedQuantity = watch('quantity_kg')
  produceNameRef.current = watchedProduceName ?? ''
  categoryRef.current = watchedCategory ?? 'vegetable'
  quantityRef.current = watchedQuantity ?? 0

  async function handleAiSuggestPrice() {
    const name = produceNameRef.current.trim()
    if (!name) {
      setAiPriceError('Please enter a produce name first.')
      return
    }
    setAiPriceLoading(true)
    setAiPriceSuggestion(null)
    setAiPriceError(null)
    try {
      const suggestion = await suggestCropPrice(name, categoryRef.current, quantityRef.current || 100)
      setAiPriceSuggestion(suggestion)
    } catch (e) {
      setAiPriceError(e instanceof Error ? e.message : 'AI suggestion failed')
    } finally {
      setAiPriceLoading(false)
    }
  }

  useEffect(() => {
    if (!isEdit || !editId || !user?.id) {
      setLoadingListing(false)
      return
    }
    let cancelled = false
    void (async () => {
      if (!isSupabaseConfigured()) {
        if (cancelled) return
        if (editId === 'l1') {
          reset({ produce_name: 'Cherry Tomatoes', category: 'vegetable', price_per_kg: 45, quantity_kg: 120, min_order_kg: 5, available_from: '', description: '' })
        } else if (editId === 'l2') {
          reset({ produce_name: 'Spinach', category: 'vegetable', price_per_kg: 30, quantity_kg: 40, min_order_kg: 2, available_from: '', description: '' })
        } else {
          setLoadError('Listing not found')
        }
        setLoadingListing(false)
        return
      }

      const { data, error } = await supabase.from('listings').select('*').eq('id', editId).maybeSingle()
      if (cancelled) return
      if (error || !data || data.farmer_id !== user.id) {
        setLoadError('Listing not found')
        setLoadingListing(false)
        return
      }
      setExistingPhotos(Array.isArray(data.photos) ? (data.photos as string[]) : [])
      reset({
        produce_name: data.produce_name,
        category: data.category as ListingFormValues['category'],
        price_per_kg: Number(data.price_per_kg),
        quantity_kg: Number(data.quantity_kg),
        min_order_kg: Number(data.min_order_kg),
        available_from: data.available_from ? String(data.available_from) : '',
        description: data.description ?? '',
      })
      setLoadingListing(false)
    })()
    return () => {
      cancelled = true
    }
  }, [editId, isEdit, reset, user?.id])

  async function uploadPhotos(farmerId: string): Promise<string[]> {
    const urls: string[] = [...existingPhotos]
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${farmerId}/${Date.now()}-${i}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (error) {
        // Silently skip photo upload errors (e.g. bucket not configured)
        console.warn('Photo upload skipped:', error.message)
        continue
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      urls.push(pub.publicUrl)
    }
    return urls.slice(0, 3)
  }

  async function onSubmit(values: ListingFormValues) {
    setSubmitError(null)
    if (!user?.id) return
    const totalPhotos = existingPhotos.length + newFiles.length
    if (totalPhotos > 3) {
      setSubmitError('Maximum 3 photos total')
      return
    }

    // Local session mode — store listing in-memory and navigate
    if (isLocal || !isSupabaseConfigured()) {
      // Also get farmer profile info from auth store so buyers can see it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authState = (window as any).__farmnexusAuthProfile ?? {}
      const id = editId ?? ('local-' + Date.now())
      localListings[id] = {
        id,
        farmer_id: user.id,
        farmer_name: authState.name ?? 'Local Farmer',
        farmer_phone: authState.phone ?? null,
        farmer_district: authState.district ?? 'Your Region',
        produce_name: values.produce_name.trim(),
        category: values.category,
        price_per_kg: values.price_per_kg,
        quantity_kg: values.quantity_kg,
        min_order_kg: values.min_order_kg,
        available_from: values.available_from?.trim() || null,
        description: values.description?.trim() || null,
        photos: [],
        is_active: true,
      }
      navigate('/farmer/listings')
      return
    }

    try {
      let photos = [...existingPhotos]

      if (newFiles.length) {
        photos = await uploadPhotos(user.id)
      }

      const { data: loc } = await supabase.from('profiles').select('location_lat, location_lng').eq('id', user.id).maybeSingle()

      const row = {
        farmer_id: user.id,
        produce_name: values.produce_name.trim(),
        category: values.category,
        price_per_kg: values.price_per_kg,
        quantity_kg: values.quantity_kg,
        min_order_kg: values.min_order_kg,
        available_from: values.available_from?.trim() || null,
        description: values.description?.trim() || null,
        photos,
        is_active: true,
        location_lat: loc?.location_lat ?? null,
        location_lng: loc?.location_lng ?? null,
      }

      if (isEdit && editId) {
        const { error } = await supabase.from('listings').update(row).eq('id', editId).eq('farmer_id', user.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('listings').insert(row)
        if (error) throw new Error(error.message)
      }
      navigate('/farmer/listings')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  function removeExistingPhoto(url: string) {
    setExistingPhotos((p) => p.filter((x) => x !== url))
  }

  function onPickFiles(files: FileList | null) {
    if (!files?.length) return
    const next = [...newFiles, ...Array.from(files)].slice(0, 3 - existingPhotos.length)
    setNewFiles(next)
  }

  if (loadingListing) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-neutral-600">Loading…</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-red-600">{loadError}</p>
        <Link to="/farmer/listings" className="mt-4 inline-block text-primary underline">
          Back to listings
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">{isEdit ? 'Edit listing' : 'Add produce'}</h1>
        <Link to="/farmer/listings" className="text-sm text-primary hover:underline">
          Cancel
        </Link>
      </div>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-8 space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-neutral-700">
          Produce name
          <input className="mt-1 w-full rounded-lg border px-3 py-2" {...register('produce_name')} />
          {errors.produce_name && <p className="mt-1 text-xs text-red-600">{errors.produce_name.message}</p>}
        </label>

        <label className="block text-sm font-medium text-neutral-700">
          Category
          <select className="mt-1 w-full rounded-lg border px-3 py-2" {...register('category')}>
            <option value="vegetable">Vegetables</option>
            <option value="fruit">Fruits</option>
            <option value="grain">Grains</option>
            <option value="dairy">Dairy</option>
            <option value="other">Other</option>
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-neutral-700">
            <span className="flex items-center justify-between">
              Price / kg (₹)
              <button
                type="button"
                id="ai-suggest-price-btn"
                onClick={() => void handleAiSuggestPrice()}
                disabled={aiPriceLoading}
                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow transition hover:opacity-90 disabled:opacity-60"
              >
                {aiPriceLoading ? (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  '✨'
                )}
                {aiPriceLoading ? 'Thinking…' : 'Suggest Price'}
              </button>
            </span>
            <input type="number" step="0.01" className="mt-1 w-full rounded-lg border px-3 py-2" {...register('price_per_kg', { valueAsNumber: true })} />
            {errors.price_per_kg && <p className="mt-1 text-xs text-red-600">{errors.price_per_kg.message}</p>}
          </label>
          <label className="block text-sm font-medium text-neutral-700">
            Stock (kg)
            <input type="number" step="0.01" className="mt-1 w-full rounded-lg border px-3 py-2" {...register('quantity_kg', { valueAsNumber: true })} />
            {errors.quantity_kg && <p className="mt-1 text-xs text-red-600">{errors.quantity_kg.message}</p>}
          </label>
          <label className="block text-sm font-medium text-neutral-700">
            Min order (kg)
            <input type="number" step="0.01" className="mt-1 w-full rounded-lg border px-3 py-2" {...register('min_order_kg', { valueAsNumber: true })} />
            {errors.min_order_kg && <p className="mt-1 text-xs text-red-600">{errors.min_order_kg.message}</p>}
          </label>
        </div>

        {/* AI Price Suggestion Banner */}
        {aiPriceError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>⚠️</span>
            <p>{aiPriceError}</p>
          </div>
        )}
        {aiPriceSuggestion && (
          <div className="relative rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">✨ AI Price Suggestion</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-800">₹{aiPriceSuggestion.price}<span className="text-sm font-medium text-emerald-600">/kg</span></p>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">{aiPriceSuggestion.reasoning}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setValue('price_per_kg', aiPriceSuggestion.price)
                  setAiPriceSuggestion(null)
                }}
                className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
              >
                Use this ✓
              </button>
            </div>
          </div>
        )}

        <label className="block text-sm font-medium text-neutral-700">
          Available from
          <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2" {...register('available_from')} />
        </label>

        <label className="block text-sm font-medium text-neutral-700">
          Description
          <textarea rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" {...register('description')} />
        </label>

        <div>
          <p className="text-sm font-medium text-neutral-700">Photos (max 3)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {existingPhotos.map((url) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded border">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white"
                  onClick={() => removeExistingPhoto(url)}
                >
                  ×
                </button>
              </div>
            ))}
            {newFiles.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex h-20 w-20 items-center justify-center rounded border bg-neutral-50 text-xs text-neutral-600">
                New
              </div>
            ))}
          </div>
          {existingPhotos.length + newFiles.length < 3 && (
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-2 text-sm"
              onChange={(e) => {
                onPickFiles(e.target.files)
                e.target.value = ''
              }}
            />
          )}
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Update listing' : 'Publish listing'}
        </button>
      </form>
    </main>
  )
}
