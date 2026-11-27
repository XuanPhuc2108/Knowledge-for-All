import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { buildAuthRedirectUrl, startOAuthSignIn } from './authFlow'

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
let anonymousClient: SupabaseClient | null = null

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

export function getAnonymousSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!anonymousClient) {
    anonymousClient = createClient(SUPABASE_URL!, anonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }
  return anonymousClient
}

export async function signInWithOAuthProvider(
  provider: 'google',
  redirectPath = '/app',
) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình')
  }
  return startOAuthSignIn(supabase.auth, provider, getAuthRedirectUrl(redirectPath))
}

export function getAuthRedirectUrl(path = '/') {
  return buildAuthRedirectUrl(PUBLIC_APP_URL, path)
}
