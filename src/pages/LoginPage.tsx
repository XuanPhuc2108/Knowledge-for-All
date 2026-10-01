import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { AuthCard } from '../components/AuthCard'
import { GradientButton } from '../components/GradientButton'
import { OAuthButtons } from '../components/OAuthButtons'
import { useAuth } from '../hooks/useAuthState'
import { isValidEmail, validateLogin } from '../lib/validation'
import { userFacingError } from '../lib/userFacingError'

export function LoginPage() {
  const { login, verifySignupOtp, resendSignupConfirmation, sendPasswordReset, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/app'
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [forgotPassword, setForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [resetSending, setResetSending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const password = fd.get('password') as string
    const validationErrors = validateLogin(email, password)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    setConfirmationEmail(null)
    setConfirmationNotice(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (e) {
      console.error('Unable to complete sign-in from the login form', e)
      const message = userFacingError(e, 'Chưa thể đăng nhập. Hãy thử lại nha.')
      setErrors({ form: message })
      if (message.includes('Xác nhận email')) setConfirmationEmail(email.trim().toLowerCase())
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return
    setResendingConfirmation(true)
    setConfirmationNotice(null)
    try {
      await resendSignupConfirmation(confirmationEmail)
      setErrors({})
      setConfirmationNotice('Đã gửi lại mã OTP. Vui lòng kiểm tra hộp thư đến và thư rác.')
    } catch (cause) {
      console.error('Unable to resend the account confirmation email', cause)
      setErrors({ form: userFacingError(cause, 'Chưa thể gửi email xác nhận. Hãy thử lại nha.') })
    } finally {
      setResendingConfirmation(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!confirmationEmail) return
    if (!/^\d{6}$/.test(otp.trim())) {
      setErrors({ otp: 'Mã OTP gồm 6 chữ số nha.' })
      return
    }
    setVerifying(true)
    setErrors({})
    try {
      await verifySignupOtp(confirmationEmail, otp.trim())
      navigate(from, { replace: true })
    } catch (cause) {
      console.error('Unable to verify the email code during sign-in', cause)
      setErrors({ otp: userFacingError(cause, 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.') })
    } finally {
      setVerifying(false)
    }
  }

  const handlePasswordResetRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    if (!isValidEmail(email)) {
      setErrors({ email: 'Email chưa đúng định dạng.' })
      return
    }
    setErrors({})
    setResetSending(true)
    try {
      await sendPasswordReset(email)
      setResetEmailSent(true)
    } catch (cause) {
      console.error('Unable to send a password recovery email', cause)
      setErrors({ form: userFacingError(cause, 'Chưa thể gửi liên kết đặt lại mật khẩu. Hãy thử lại nha.') })
    } finally {
      setResetSending(false)
    }
  }

  return (
    <AuthCard
      title={forgotPassword ? 'Lấy lại mật khẩu' : 'Đăng nhập'}
      subtitle={forgotPassword
        ? 'Nhập email tài khoản, Booki sẽ gửi liên kết để bạn đặt mật khẩu mới.'
        : 'Đăng nhập Booki để tiếp tục tìm và chia sẻ những cuốn sách hay.'}
      footerText="Chưa có tài khoản?"
      footerLink="/register"
      footerLinkLabel="Đăng ký ngay"
    >
      <form onSubmit={(event) => {
        if (forgotPassword) {
          void handlePasswordResetRequest(event)
        } else if (confirmationEmail) {
          event.preventDefault()
          void handleVerifyOtp()
        } else {
          void handleSubmit(event)
        }
      }} className="space-y-4">
        {confirmationNotice && <p className="text-sm text-accent-teal" role="status">{confirmationNotice}</p>}
        {resetEmailSent && forgotPassword && (
          <p className="rounded-xl border border-accent-teal/20 bg-accent-teal/[0.06] p-3 text-sm leading-relaxed text-accent-teal" role="status">
            Nếu email này có tài khoản Booki, liên kết đặt lại mật khẩu đã được gửi. Nhớ kiểm tra cả thư rác nha.
          </p>
        )}
        {errors.form && (
          <p className="text-sm text-accent-rose" role="alert">{errors.form}</p>
        )}
        {confirmationEmail && !forgotPassword && (
          <div className="space-y-3 rounded-2xl border border-accent-yellow/20 bg-accent-yellow/[0.06] p-4">
            <p className="text-xs leading-relaxed text-text-muted">
              Nhập mã 6 số gửi tới <span className="font-semibold text-text-primary">{confirmationEmail}</span>.
            </p>
            <button type="button" className="text-sm font-semibold text-accent-yellow underline underline-offset-2 disabled:opacity-60" disabled={resendingConfirmation} onClick={() => void handleResendConfirmation()}>
              {resendingConfirmation ? 'Đang gửi...' : 'Gửi lại mã OTP'}
            </button>
            <div>
              <label htmlFor="login-otp" className="mb-1.5 block text-xs font-medium text-text-primary">Mã OTP trong email</label>
              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="field-control w-full px-4 py-3 text-center text-lg font-bold tracking-[0.4em]"
              />
              {errors.otp && <p className="mt-1 text-xs text-accent-rose" role="alert">{errors.otp}</p>}
            </div>
            <GradientButton type="button" disabled={verifying || otp.length !== 6} className="w-full" onClick={() => void handleVerifyOtp()}>
              {verifying ? 'Đang xác nhận...' : 'Xác nhận email'}
            </GradientButton>
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required={!confirmationEmail}
            className="field-control px-4 py-3 text-sm"
          />
          {errors.email && <p className="mt-1 text-xs text-accent-rose">{errors.email}</p>}
        </div>
        {forgotPassword ? (
          <>
            <GradientButton type="submit" disabled={resetSending} className="w-full">
              {resetSending ? 'Đang gửi liên kết...' : 'Gửi liên kết đặt lại mật khẩu'}
            </GradientButton>
            <button
              type="button"
              className="block w-full text-center text-sm font-semibold text-accent-yellow hover:underline"
              onClick={() => { setForgotPassword(false); setResetEmailSent(false); setErrors({}) }}
            >
              Quay lại đăng nhập
            </button>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Mật khẩu</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required={!confirmationEmail}
                  autoComplete="current-password"
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
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-accent-rose">{errors.password}</p>}
            </div>
            <GradientButton type="submit" disabled={loading || oauthBusy} className="w-full">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </GradientButton>
            <button
              type="button"
              className="block w-full text-center text-sm font-semibold text-text-muted hover:text-accent-yellow"
              onClick={() => {
                setForgotPassword(true)
                setResetEmailSent(false)
                setConfirmationEmail(null)
                setConfirmationNotice(null)
                setErrors({})
              }}
            >
              Quên mật khẩu?
            </button>
            <OAuthButtons
              disabled={loading}
              googleLabel="Đăng nhập bằng Google"
              facebookLabel="Đăng nhập bằng Facebook"
              googleBusyLabel="Đang chuyển đến Google..."
              facebookBusyLabel="Đang chuyển đến Facebook..."
              onError={(message) => setErrors({ form: message })}
              onBusyChange={setOauthBusy}
            />
          </>
        )}
        <Link to="/" className="block text-center text-sm text-text-muted hover:text-accent-yellow">
          ← Về trang chủ
        </Link>
      </form>
    </AuthCard>
  )
}
