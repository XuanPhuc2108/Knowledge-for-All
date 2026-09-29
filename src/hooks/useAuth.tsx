import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getAdapter } from '../lib/dataAdapter'
import { getSupabaseClient } from '../lib/supabase'
import { AuthContext } from './authContext'
import type { AuthContextValue } from '../types/auth'
import type { UserProfile } from '../types/user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = useCallback(async () => {
    try {
      const current = await getAdapter().getCurrentUser()
      setUser(current)
      setError(null)
    } catch (e) {
      setUser(null)
      setError(e instanceof Error ? e.message : 'Không thể tải hồ sơ người dùng')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let refreshTimer: number | undefined
    const supabase = getSupabaseClient()

    void (async () => {
      setLoading(true)
      await refreshUser()
      if (!cancelled) setLoading(false)
    })()

    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setError(null)
        return
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
        refreshTimer = window.setTimeout(() => {
          if (!cancelled) void refreshUser()
        }, 0)
      }
    })

    return () => {
      cancelled = true
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
      subscription.unsubscribe()
    }
  }, [refreshUser])

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    setError(null)
    try {
      const profile = await getAdapter().register({ fullName, email, password })
      if (profile) setUser(profile)
      return profile
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Đăng ký thất bại'
      setError(msg)
      throw e
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const profile = await getAdapter().login({ email, password })
      setUser(profile)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Đăng nhập thất bại'
      setError(msg)
      throw e
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await getAdapter().logout()
      setUser(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng xuất thất bại')
      throw e
    }
  }, [])

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Chưa đăng nhập')
    const updated = await getAdapter().updateProfile(user.id, data)
    setUser(updated)
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, register, login, logout, updateProfile, refreshUser }),
    [user, loading, error, register, login, logout, updateProfile, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
