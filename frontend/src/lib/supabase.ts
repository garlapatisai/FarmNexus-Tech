import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder')

export function isSupabaseConfigured(): boolean {
  // Detect common placeholders — if the env values are still defaults, treat as unconfigured
  if (!url || !anon) return false
  if (url.includes('your-project') || url.includes('placeholder')) return false
  if (anon === 'your-anon-key' || anon === 'placeholder' || anon.length < 20) return false
  return true
}
