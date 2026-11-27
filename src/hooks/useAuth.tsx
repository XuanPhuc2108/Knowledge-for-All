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
  const [passwordRecovery, setPasswordRecovery] = useState(false)

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
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
        return
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setError(null)
        setPasswordRecovery(false)
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

  const sendEmailOtp = useCallback(async (email: string) => {
    setError(null)
    await getAdapter().sendEmailOtp(email)
  }, [])

  const resendEmailOtp = useCallback(async (email: string) => {
    setError(null)
    await getAdapter().resendEmailOtp(email)
  }, [])

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    setError(null)
    try {
      const profile = await getAdapter().verifyEmailOtp(email, token)
      if (profile) setUser(profile)
      return profile
    } catch (e) {
      console.error('Unable to verify the passwordless email OTP', e)
      setError(userFacingError(e, 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.'))
      throw e
    }
  }, [])

  const completeProfile = useCallback(async (fullName: string) => {
    setError(null)
    try {
      const profile = await getAdapter().completeProfile(fullName)
      setUser(profile)
      return profile
    } catch (e) {
      console.error('Unable to complete the authenticated profile', e)
      setError(userFacingError(e, 'Chưa thể lưu tên hiển thị. Hãy thử lại nha.'))
      throw e
    }
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    await getAdapter().sendPasswordReset(email)
  }, [])

  const completePasswordReset = useCallback(async (newPassword: string) => {
    if (!passwordRecovery) {
      throw new Error('Phiên khôi phục mật khẩu chưa được xác thực.')
    }
    await getAdapter().completePasswordReset(newPassword)
    setPasswordRecovery(false)
    await refreshUser()
  }, [passwordRecovery, refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const profile = await getAdapter().login({ email, password })
      if (profile) setUser(profile)
      return profile
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
    () => ({
      user,
      loading,
      error,
      passwordRecovery,
      sendEmailOtp,
      resendEmailOtp,
      verifyEmailOtp,
      completeProfile,
      sendPasswordReset,
      completePasswordReset,
      login,
      logout,
      deleteAccount,
      changePassword,
      updateProfile,
      refreshUser,
    }),
    [
      user,
      loading,
      error,
      passwordRecovery,
      sendEmailOtp,
      resendEmailOtp,
      verifyEmailOtp,
      completeProfile,
      sendPasswordReset,
      completePasswordReset,
      login,
      logout,
      deleteAccount,
      changePassword,
      updateProfile,
      refreshUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
