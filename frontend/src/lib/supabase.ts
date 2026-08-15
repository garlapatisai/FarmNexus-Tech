import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://rhhcsiljjgctwygfhfnu.supabase.co'
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KgczXv604jqBW4wLbpA6mw_GuT51bC6'

export const supabase = createClient(url, anon)

export function isSupabaseConfigured(): boolean {
  if (!url || !anon) return false
  if (url.includes('your-project') || url.includes('placeholder')) return false
  if (anon === 'your-anon-key' || anon === 'placeholder' || anon.length < 20) return false
  return true
}
