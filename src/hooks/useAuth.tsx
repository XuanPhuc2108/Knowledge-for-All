import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getAdapter } from '../lib/dataAdapter'
import { getSupabaseClient } from '../lib/supabase'
import { userFacingError } from '../lib/userFacingError'
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
      console.error('Unable to load the signed-in user profile', e)
      setError(userFacingError(e, 'Chưa thể tải hồ sơ. Vui lòng tải lại trang nha.'))
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
      console.error('Unable to register the account', e)
      const msg = userFacingError(e, 'Chưa thể tạo tài khoản. Hãy thử lại nha.')
      setError(msg)
      throw e
    }
  }, [])

  const resendSignupConfirmation = useCallback(async (email: string) => {
    await getAdapter().resendSignupConfirmation(email)
  }, [])

  const verifySignupOtp = useCallback(async (email: string, token: string) => {
    setError(null)
    try {
      const profile = await getAdapter().verifySignupOtp(email, token)
      setUser(profile)
      return profile
    } catch (e) {
      console.error('Unable to verify the signup email OTP', e)
      const msg = userFacingError(e, 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.')
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
      console.error('Unable to sign in the account', e)
      const msg = userFacingError(e, 'Chưa thể đăng nhập. Hãy thử lại nha.')
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
      console.error('Unable to sign out the account', e)
      setError(userFacingError(e, 'Chưa thể đăng xuất. Hãy thử lại nha.'))
      throw e
    }
  }, [])

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('Chưa đăng nhập')
    await getAdapter().deleteAccount(user.id)
    setUser(null)
    setError(null)
  }, [user])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Chưa đăng nhập')
    await getAdapter().changePassword(user.id, currentPassword, newPassword)
  }, [user])

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Chưa đăng nhập')
    const updated = await getAdapter().updateProfile(user.id, data)
    setUser(updated)
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, register, verifySignupOtp, resendSignupConfirmation, login, logout, deleteAccount, changePassword, updateProfile, refreshUser }),
    [user, loading, error, register, verifySignupOtp, resendSignupConfirmation, login, logout, deleteAccount, changePassword, updateProfile, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
