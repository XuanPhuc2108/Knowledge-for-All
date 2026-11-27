import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, Mail } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { GradientButton } from '../components/GradientButton'
import { OAuthButtons } from '../components/OAuthButtons'
import { useAuth } from '../hooks/useAuthState'
import { useOtpResendCooldown } from '../hooks/useOtpResendCooldown'
import {
  getOAuthDisplayName,
  getSafeAuthRedirectPath,
  isValidEmailOtp,
  normalizeEmailAddress,
} from '../lib/authFlow'
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from '../lib/supabase'
import { userFacingError } from '../lib/userFacingError'
import { validatePassword } from '../lib/validation'

type AuthStep =
  | 'methods'
  | 'email'
  | 'email-code'
  | 'name'
  | 'password'
  | 'forgot-password'

function stripOAuthCallbackParameters(path: string): string {
  try {
    const url = new URL(path, 'https://booki.invalid')
    for (const key of ['error', 'error_code', 'error_description']) {
      url.searchParams.delete(key)
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/app'
  }
}

function getOAuthErrorMessage(search: string): string | null {
  const params = new URLSearchParams(search)
  const error = `${params.get('error') ?? ''} ${params.get('error_code') ?? ''} ${params.get('error_description') ?? ''}`
  if (!error.trim()) return null
  if (/access_denied|cancel|denied/i.test(error)) {
    return 'Bạn đã dừng đăng nhập. Chọn cách khác hoặc thử lại khi sẵn sàng nha.'
  }
  return 'Chưa thể hoàn tất đăng nhập. Hãy thử lại hoặc chọn cách khác nha.'
}

function authError(cause: unknown, fallback: string): string {
  return userFacingError(cause, fallback)
}

export function LoginPage() {
  const { user, loading: authLoading, login, sendEmailOtp, resendEmailOtp, verifyEmailOtp, completeProfile, sendPasswordReset, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = location.state as {
    from?: { pathname?: string; search?: string; hash?: string }
  } | null
  const requestedPath = routeState?.from
    ? `${routeState.from.pathname ?? '/app'}${routeState.from.search ?? ''}${routeState.from.hash ?? ''}`
    : '/app'
  const from = stripOAuthCallbackParameters(getSafeAuthRedirectPath(requestedPath, '/app'))
  const callbackError = getOAuthErrorMessage(
    location.search || routeState?.from?.search || '',
  )

  const [step, setStep] = useState<AuthStep>('methods')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checkingSession, setCheckingSession] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const actionInFlight = useRef(false)
  const sessionCheckStarted = useRef(false)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const otpInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { secondsRemaining: resendCooldown, startCooldown } = useOtpResendCooldown()

  useEffect(() => {
    if (user?.fullName.trim()) {
      navigate(from, { replace: true })
      return
    }
    if (authLoading || !isSupabaseConfigured || sessionCheckStarted.current) return

    sessionCheckStarted.current = true
    let cancelled = false
    setCheckingSession(true)
    void (async () => {
      try {
        const supabase = getSupabaseClient()
        if (!supabase) return
        const { data: { user: identity }, error } = await supabase.auth.getUser()
        if (error && !/auth session missing/i.test(error.message)) throw error
        if (!identity) return

        const provider = identity.app_metadata.provider
        if (provider === 'email' && !identity.email_confirmed_at) {
          const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
          if (signOutError) throw signOutError
          if (!cancelled) {
            setEmail(identity.email ?? '')
            setStep('email')
            setErrors({ form: 'Email này chưa xác nhận. Nhập lại email để nhận mã xác nhận nha.' })
          }
          return
        }
        if (provider === 'google' && !user?.fullName.trim()) {
          const suggestedName = getOAuthDisplayName(identity.user_metadata)
          if (suggestedName) {
            await completeProfile(suggestedName)
            return
          }
        }
        if (!cancelled) setStep('name')
      } catch (cause) {
        if (!cancelled) {
          console.error('Unable to resume the authenticated profile setup', cause)
          setErrors({ form: authError(cause, 'Chưa thể kiểm tra phiên đăng nhập. Hãy thử tải lại nha.') })
        }
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    })()
    return () => { cancelled = true }
  }, [authLoading, callbackError, completeProfile, from, navigate, user])

  useEffect(() => {
    if (step === 'email') emailInputRef.current?.focus()
    if (step === 'email-code') otpInputRef.current?.focus()
    if (step === 'name') nameInputRef.current?.focus()
  }, [step])

  useEffect(() => {
    const field = Object.keys(errors).find((key) => key !== 'form')
    if (field) document.getElementById(`auth-${field}`)?.focus()
  }, [errors])

  const resetForm = () => {
    if (callbackError) {
      navigate(
        { pathname: location.pathname, search: '', hash: '' },
        { replace: true, state: location.state },
      )
    }
    setErrors({})
    setNotice(null)
    setOtp('')
    setPassword('')
    setResetSent(false)
  }

  const goBackFromName = async () => {
    if (actionInFlight.current) return
    actionInFlight.current = true
    setBusy(true)
    try {
      await logout()
      sessionCheckStarted.current = false
      setDisplayName('')
      setStep('methods')
      resetForm()
    } catch (cause) {
      setErrors({ form: authError(cause, 'Chưa thể đổi cách đăng nhập. Hãy thử lại nha.') })
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }

  const handleSendEmailOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (actionInFlight.current) return
    const normalizedEmail = normalizeEmailAddress(email)
    if (!normalizedEmail) {
      setErrors({ email: 'Nhập địa chỉ email hợp lệ, tối đa 254 ký tự nha.' })
      return
    }
    actionInFlight.current = true
    setBusy(true)
    resetForm()
    try {
      await sendEmailOtp(normalizedEmail)
      setEmail(normalizedEmail)
      setOtp('')
      startCooldown()
      setStep('email-code')
      setNotice('Mã xác nhận đã được gửi. Hãy kiểm tra hộp thư đến và thư rác nha.')
    } catch (cause) {
      console.error('Unable to send a passwordless email OTP', cause)
      setErrors({ form: authError(cause, 'Chưa thể gửi mã email. Hãy thử lại sau ít phút nha.') })
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }

  const handleResendOtp = async () => {
    if (actionInFlight.current || resendCooldown > 0) return
    actionInFlight.current = true
    setBusy(true)
    setErrors({})
    setNotice(null)
    try {
      await resendEmailOtp(email)
      setOtp('')
      startCooldown()
      setNotice('Mã mới đã được gửi. Hãy kiểm tra lại nha.')
    } catch (cause) {
      console.error('Unable to resend the passwordless OTP', cause)
      setErrors({ form: authError(cause, 'Chưa thể gửi lại mã. Hãy thử lại sau ít phút nha.') })
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (actionInFlight.current) return
    if (!isValidEmailOtp(otp)) {
      setErrors({ otp: 'Mã OTP gồm 6 chữ số nha.' })
      return
    }
    actionInFlight.current = true
    setBusy(true)
    setErrors({})
    try {
      const profile = await verifyEmailOtp(email, otp)
      if (profile?.fullName.trim()) {
        navigate(from, { replace: true })
      } else {
        setDisplayName('')
        setStep('name')
      }
    } catch (cause) {
      console.error('Unable to verify the passwordless OTP', cause)
      setErrors({ otp: authError(cause, 'Mã OTP chưa đúng hoặc đã hết hạn. Hãy kiểm tra rồi thử lại nha.') })
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }

  const handleCompleteProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (actionInFlight.current) return
    const normalizedName = displayName.trim()
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      setErrors({ name: 'Tên hiển thị cần có từ 2 đến 80 ký tự nha.' })
      return
    }
    actionInFlight.current = true
    setBusy(true)
    setErrors({})
    try {
      await completeProfile(normalizedName)
      navigate(from, { replace: true })
    } catch (cause) {
      console.error('Unable to save the new Booki display name', cause)
      setErrors({ form: authError(cause, 'Chưa thể lưu tên hiển thị. Hãy thử lại nha.') })
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (actionInFlight.current) return
    const normalizedEmail = normalizeEmailAddress(email)
    if (!normalizedEmail) {
      setErrors({ email: 'Nhập địa chỉ email hợp lệ nha.' })
      return
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      setErrors({ password: passwordError })
      return
    }
    actionInFlight.current = true
    setBusy(true)
    setErrors({})
    try {
      const profile = await login(normalizedEmail, password)
      if (profile?.fullName.trim()) navigate(from, { replace: true })
      else setStep('name')
    } catch (cause) {
      console.error('Unable to sign in with an existing password', cause)
      setErrors({ form: authError(cause, 'Chưa thể đăng nhập. Kiểm tra thông tin rồi thử lại nha.') })
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = normalizeEmailAddress(email)
    if (!normalizedEmail) {
      setErrors({ email: 'Nhập địa chỉ email hợp lệ nha.' })
      return
    }
    if (actionInFlight.current) return
    actionInFlight.current = true
    setBusy(true)
    setErrors({})
    try {
      await sendPasswordReset(normalizedEmail)
      setResetSent(true)
    } catch (cause) {
      console.error('Unable to send an existing account password reset', cause)
      setErrors({ form: authError(cause, 'Chưa thể gửi liên kết đặt lại mật khẩu. Hãy thử lại nha.') })
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }

  const submitHandler = step === 'email'
    ? handleSendEmailOtp
    : step === 'email-code'
      ? handleVerifyOtp
      : step === 'name'
        ? handleCompleteProfile
        : step === 'password'
          ? handlePasswordLogin
          : handlePasswordReset

  const title = step === 'methods'
    ? 'Chào mừng bạn đến với Booki'
    : step === 'email'
      ? 'Địa chỉ email'
      : step === 'email-code'
        ? 'Nhập mã xác nhận'
        : step === 'name'
          ? 'Bạn tên gì?'
          : step === 'password'
            ? 'Đăng nhập bằng mật khẩu'
            : 'Lấy lại mật khẩu'

  const subtitle = step === 'methods'
    ? 'Tìm sách hay, chia sẻ cùng mọi người.'
    : step === 'email'
      ? 'Dùng email để nhận mã xác nhận, không cần tạo mật khẩu.'
      : step === 'email-code'
        ? `Nhập mã 6 số đã gửi đến ${email}.`
        : step === 'name'
          ? 'Tên này sẽ hiện trên hồ sơ Booki của bạn.'
          : step === 'password'
            ? 'Dành cho tài khoản đã có mật khẩu.'
            : 'Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.'

  const goTo = (next: AuthStep) => {
    resetForm()
    setStep(next)
  }

  return (
    <AuthCard title={title} subtitle={subtitle}>
      <div aria-busy={busy || checkingSession} className="space-y-4">
        {(errors.form || callbackError) && (
          <p className="text-sm text-accent-rose" role="alert">{errors.form || callbackError}</p>
        )}
        {notice && <p className="text-sm text-accent-teal" role="status">{notice}</p>}
        {(authLoading || checkingSession) && (
          <p className="text-sm text-text-muted" role="status">Đang kiểm tra phiên đăng nhập...</p>
        )}

        {step === 'methods' && (
          <>
            <OAuthButtons
              disabled={busy || checkingSession || authLoading}
              googleLabel="Tiếp tục với Google"
              googleBusyLabel="Đang chuyển đến Google..."
              redirectTo={from}
              onError={(message) => setErrors({ form: message })}
            />
            <div className="flex items-center gap-3 py-1" aria-hidden="true">
              <span className="h-px flex-1 bg-glass/10" />
              <span className="text-xs text-text-muted">hoặc</span>
              <span className="h-px flex-1 bg-glass/10" />
            </div>
            <button
              type="button"
              onClick={() => goTo('email')}
              disabled={busy || checkingSession}
              className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.82)] px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-[rgb(var(--color-interactive-hover)/.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail aria-hidden="true" className="h-4 w-4 text-accent-yellow" />
              Tiếp tục với Email
            </button>
            <button
              type="button"
              onClick={() => goTo('password')}
              disabled={busy || checkingSession}
              className="block min-h-10 w-full text-center text-sm font-semibold text-text-muted transition-colors hover:text-accent-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
            >
              Đăng nhập bằng mật khẩu
            </button>
          </>
        )}

        {step === 'email' && (
          <form onSubmit={(event) => void submitHandler(event)} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-text-primary">Địa chỉ email</label>
              <input
                id="auth-email"
                ref={emailInputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                required
                disabled={busy}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setErrors((current) => ({ ...current, email: '', form: '' }))
                }}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'auth-email-error' : undefined}
                className="field-control px-4 py-3 text-sm"
              />
              {errors.email && <p id="auth-email-error" className="mt-1 text-xs text-accent-rose" role="alert">{errors.email}</p>}
            </div>
            <GradientButton type="submit" className="w-full" disabled={busy || authLoading || resendCooldown > 0}>
              {busy ? 'Đang gửi mã...' : resendCooldown > 0 ? `Chờ ${resendCooldown} giây để gửi mã` : 'Tiếp tục'}
            </GradientButton>
            <button
              type="button"
              onClick={() => goTo('methods')}
              disabled={busy}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 text-sm font-semibold text-text-muted hover:text-accent-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Quay lại
            </button>
          </form>
        )}

        {step === 'email-code' && (
          <form onSubmit={(event) => void submitHandler(event)} className="space-y-4">
            <div>
              <label htmlFor="auth-otp" className="mb-1.5 block text-sm font-medium text-text-primary">Mã xác nhận 6 số</label>
              <input
                id="auth-otp"
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                pattern="[0-9]{6}"
                maxLength={6}
                required
                disabled={busy}
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                  setErrors((current) => ({ ...current, otp: '', form: '' }))
                }}
                aria-invalid={Boolean(errors.otp)}
                aria-describedby={errors.otp ? 'auth-otp-error' : undefined}
                className="field-control px-4 py-3 text-center text-xl font-bold tracking-[0.45em]"
              />
              {errors.otp && <p id="auth-otp-error" className="mt-1 text-xs text-accent-rose" role="alert">{errors.otp}</p>}
            </div>
            <GradientButton type="submit" className="w-full" disabled={busy || !isValidEmailOtp(otp)}>
              {busy ? 'Đang xác nhận...' : 'Xác nhận'}
            </GradientButton>
            <button
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={busy || resendCooldown > 0}
              className="block min-h-10 w-full text-center text-sm font-semibold text-accent-yellow underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Đang gửi...' : resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown} giây` : 'Gửi lại mã'}
            </button>
            <button
              type="button"
              onClick={() => goTo('email')}
              disabled={busy}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 text-sm font-semibold text-text-muted hover:text-accent-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Đổi email
            </button>
          </form>
        )}

        {step === 'name' && (
          <form onSubmit={(event) => void submitHandler(event)} className="space-y-4">
            <div>
              <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-text-primary">Tên hiển thị</label>
              <input
                id="auth-name"
                ref={nameInputRef}
                type="text"
                autoComplete="name"
                maxLength={80}
                minLength={2}
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'auth-name-error' : undefined}
                className="field-control px-4 py-3 text-sm"
                placeholder="Tên bạn muốn mọi người gọi"
              />
              {errors.name && <p id="auth-name-error" className="mt-1 text-xs text-accent-rose" role="alert">{errors.name}</p>}
            </div>
            <GradientButton type="submit" className="w-full" disabled={busy}>
              {busy ? 'Đang hoàn tất...' : 'Hoàn tất'}
            </GradientButton>
            <button
              type="button"
              onClick={() => void goBackFromName()}
              disabled={busy}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 text-sm font-semibold text-text-muted hover:text-accent-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Chọn cách khác
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={(event) => void submitHandler(event)} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-text-primary">Địa chỉ email</label>
              <input
                id="auth-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'auth-email-error' : undefined}
                className="field-control px-4 py-3 text-sm"
              />
              {errors.email && <p id="auth-email-error" className="mt-1 text-xs text-accent-rose" role="alert">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-text-primary">Mật khẩu</label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'auth-password-error' : undefined}
                  className="field-control px-4 py-3 pr-12 text-sm"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
                >
                  {showPassword
                    ? <EyeOff aria-hidden="true" className="h-4 w-4" />
                    : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p id="auth-password-error" className="mt-1 text-xs text-accent-rose" role="alert">{errors.password}</p>}
            </div>
            <GradientButton type="submit" className="w-full" disabled={busy}>
              {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </GradientButton>
            <button
              type="button"
              onClick={() => goTo('forgot-password')}
              disabled={busy}
              className="block min-h-10 w-full text-center text-sm font-semibold text-text-muted hover:text-accent-yellow"
            >
              Quên mật khẩu?
            </button>
            <button type="button" onClick={() => goTo('methods')} className="block min-h-10 w-full text-center text-sm font-semibold text-text-muted hover:text-accent-yellow">
              Quay lại
            </button>
          </form>
        )}

        {step === 'forgot-password' && (
          <form onSubmit={(event) => void submitHandler(event)} className="space-y-4">
            {resetSent && (
              <p className="rounded-xl border border-accent-teal/20 bg-accent-teal/[0.06] p-3 text-sm leading-relaxed text-accent-teal" role="status">
                Nếu email này có tài khoản Booki, liên kết đặt lại mật khẩu đã được gửi. Nhớ kiểm tra cả thư rác nha.
              </p>
            )}
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-text-primary">Địa chỉ email</label>
              <input
                id="auth-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'auth-email-error' : undefined}
                className="field-control px-4 py-3 text-sm"
              />
              {errors.email && <p id="auth-email-error" className="mt-1 text-xs text-accent-rose" role="alert">{errors.email}</p>}
            </div>
            <GradientButton type="submit" className="w-full" disabled={busy || resetSent}>
              {busy ? 'Đang gửi liên kết...' : 'Gửi liên kết đặt lại mật khẩu'}
            </GradientButton>
            <button type="button" onClick={() => goTo('password')} className="block min-h-10 w-full text-center text-sm font-semibold text-text-muted hover:text-accent-yellow">
              Quay lại đăng nhập
            </button>
          </form>
        )}

        <Link to="/" className="block min-h-10 text-center text-sm text-text-muted hover:text-accent-yellow">
          ← Về trang chủ
        </Link>
      </div>
    </AuthCard>
  )
}
