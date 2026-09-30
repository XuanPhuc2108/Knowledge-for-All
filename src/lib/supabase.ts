import { createClient, type Provider, type SupabaseClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    url.pathname = url.pathname
      .replace(/\/rest\/v1\/?$/i, '')
      .replace(/\/+$/, '')
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return undefined
  }
}

const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
const PUBLIC_APP_URL = ((import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim() || 'https://booki-vn.vercel.app').replace(/\/+$/, '')

export const isSupabaseConfigured = Boolean(SUPABASE_URL && anonKey)

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(SUPABASE_URL!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export async function signInWithOAuthProvider(provider: Extract<Provider, 'google' | 'facebook'>) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình')
  }
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: PUBLIC_APP_URL },
  })
}

export function getAuthRedirectUrl() {
  return PUBLIC_APP_URL
}
