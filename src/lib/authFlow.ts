import type { SupabaseClient } from '@supabase/supabase-js'
import type { LoginInput, UserProfile } from '../types/user'

const AUTH_REDIRECT_ORIGIN = 'https://booki.invalid'
export const OTP_RESEND_COOLDOWN_SECONDS = 60
type SupabaseAuth = SupabaseClient['auth']

export class AuthProfileSetupError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AuthProfileSetupError'
  }
}

export function getSafeAuthRedirectPath(path: unknown, fallback = '/app'): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return fallback
  }

  try {
    const url = new URL(path, AUTH_REDIRECT_ORIGIN)
    if (url.origin !== AUTH_REDIRECT_ORIGIN || ['/login', '/register'].includes(url.pathname)) {
      return fallback
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function buildAuthRedirectUrl(appUrl: string, path = '/'): string {
  const appOrigin = new URL(appUrl).origin
  const safePath = getSafeAuthRedirectPath(path, '/')
  return safePath === '/' ? appOrigin : new URL(safePath, `${appOrigin}/`).toString()
}

export function isValidEmailOtp(token: string): boolean {
  return /^\d{6}$/.test(token.trim())
}

export function normalizeEmailAddress(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (
    normalized.length > 254
    || normalized.length === 0
    || /[\s<>(),;:"\\[\]]/.test(normalized)
    || Array.from(normalized).some((character) => {
      const codePoint = character.charCodeAt(0)
      return codePoint < 32 || codePoint === 127
    })
    || normalized.split('@').length !== 2
    || normalized.split('@')[0].length > 64
    || normalized.includes('..')
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return null
  }
  return normalized
}

export function getOAuthDisplayName(userMetadata: unknown): string | undefined {
  if (typeof userMetadata !== 'object' || userMetadata === null) return undefined
  const metadata = userMetadata as Record<string, unknown>
  const directName = [metadata.full_name, metadata.name].find(
    (value): value is string => typeof value === 'string' && value.trim().length >= 2,
  )
  const parts = [metadata.given_name, metadata.family_name]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
  const name = directName ?? parts.join(' ')
  const normalized = name?.trim().slice(0, 80)
  return normalized || undefined
}

export function buildMinimalProfilePayload(
  identity: { id: string; email?: string | null },
  fullName: string,
) {
  const name = fullName.trim()
  const email = identity.email?.trim()
  if (!identity.id || name.length < 2 || name.length > 80) {
    throw new Error('Tên hiển thị cần có từ 2 đến 80 ký tự.')
  }
  if (!email) throw new Error('Tài khoản chưa cung cấp email để tạo hồ sơ.')
  return {
    id: identity.id,
    full_name: name,
    email,
    location_enabled: false,
  }
}

export function getOtpResendCooldownRemaining(
  lastSentAt: number,
  now = Date.now(),
  cooldownSeconds = OTP_RESEND_COOLDOWN_SECONDS,
): number {
  return Math.max(0, Math.ceil((lastSentAt + cooldownSeconds * 1000 - now) / 1000))
}

export async function sendEmailOtp(
  auth: Pick<SupabaseAuth, 'signInWithOtp'>,
  email: string,
): Promise<void> {
  const normalizedEmail = normalizeEmailAddress(email)
  if (!normalizedEmail) throw new Error('Địa chỉ email chưa đúng định dạng.')
  const { error } = await auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true },
  })
  if (error) throw new Error(error.message)
}

export async function verifyEmailOtp(
  auth: Pick<SupabaseAuth, 'verifyOtp'>,
  email: string,
  token: string,
) {
  const normalizedEmail = normalizeEmailAddress(email)
  if (!normalizedEmail) throw new Error('Địa chỉ email chưa đúng định dạng.')
  if (!isValidEmailOtp(token)) throw new Error('Mã OTP gồm 6 chữ số nha.')
  const { data, error } = await auth.verifyOtp({
    email: normalizedEmail,
    token: token.trim(),
    type: 'email',
  })
  if (error) throw new Error(error.message)
  if (
    !data.user?.email_confirmed_at
    || data.user.email?.toLowerCase() !== normalizedEmail
  ) {
    throw new Error('Mã OTP chưa xác nhận được email. Vui lòng kiểm tra lại mã OTP.')
  }
  return data.user
}

export async function completeEmailOtpVerification(
  auth: Pick<SupabaseAuth, 'verifyOtp'>,
  email: string,
  token: string,
  initializeProfile: () => Promise<UserProfile | null>,
): Promise<UserProfile | null> {
  await verifyEmailOtp(auth, email, token)
  try {
    return await initializeProfile()
  } catch (cause) {
    throw new AuthProfileSetupError(
      'Email đã xác nhận nhưng hồ sơ chưa thể tải được. Hãy đăng nhập lại; nếu vẫn lỗi, liên hệ hỗ trợ.',
      { cause },
    )
  }
}

export async function loginWithEmail(
  auth: Pick<SupabaseAuth, 'signInWithPassword' | 'signOut'>,
  input: LoginInput,
  initializeProfile: () => Promise<UserProfile | null>,
): Promise<UserProfile | null> {
  const { data, error } = await auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  })
  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      throw new Error('Xác nhận email bằng mã OTP trước khi đăng nhập.')
    }
    throw new Error(error.message)
  }
  if (
    data.user?.app_metadata.provider === 'email' &&
    !data.user.email_confirmed_at
  ) {
    const { error: signOutError } = await auth.signOut({ scope: 'local' })
    if (signOutError) throw new Error(signOutError.message)
    throw new Error('Xác nhận email bằng mã OTP trước khi đăng nhập.')
  }

  return initializeProfile()
}

export async function sendPasswordResetEmail(
  auth: Pick<SupabaseAuth, 'resetPasswordForEmail'>,
  email: string,
  redirectTo: string,
): Promise<void> {
  const { error } = await auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
  if (error) throw new Error(error.message)
}

export async function startOAuthSignIn(
  auth: Pick<SupabaseAuth, 'signInWithOAuth'>,
  provider: 'google',
  redirectTo: string,
) {
  return auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  })
}

export function isEmailConfirmationRequired(message: string): boolean {
  return /email not confirmed|email chưa xác nhận|xác nhận email/i.test(message)
}
