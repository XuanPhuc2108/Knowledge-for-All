import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { GradientButton } from '../components/GradientButton'
import { OAuthButtons } from '../components/OAuthButtons'
import { useAuth } from '../hooks/useAuthState'
import { validateLogin } from '../lib/validation'
import { userFacingError } from '../lib/userFacingError'

export function LoginPage() {
  const { login, verifySignupOtp, resendSignupConfirmation, user } = useAuth()
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

  return (
    <AuthCard
      title="Đăng nhập"
      subtitle="Đăng nhập Booki để tiếp tục tìm và chia sẻ những cuốn sách hay."
      footerText="Chưa có tài khoản?"
      footerLink="/register"
      footerLinkLabel="Đăng ký ngay"
    >
      <form onSubmit={(event) => {
        if (confirmationEmail) {
          event.preventDefault()
          void handleVerifyOtp()
        } else {
          void handleSubmit(event)
        }
      }} className="space-y-4">
        {confirmationNotice && <p className="text-sm text-accent-teal" role="status">{confirmationNotice}</p>}
        {errors.form && (
          <p className="text-sm text-accent-rose" role="alert">{errors.form}</p>
        )}
        {confirmationEmail && (
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
            required={!confirmationEmail}
            className="field-control px-4 py-3 text-sm"
          />
          {errors.email && <p className="mt-1 text-xs text-accent-rose">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Mật khẩu</label>
          <input
            id="password"
            name="password"
            type="password"
            required={!confirmationEmail}
            className="field-control px-4 py-3 text-sm"
          />
          {errors.password && <p className="mt-1 text-xs text-accent-rose">{errors.password}</p>}
        </div>
        <GradientButton type="submit" disabled={loading || oauthBusy} className="w-full">
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </GradientButton>
        <OAuthButtons
          disabled={loading}
          googleLabel="Đăng nhập bằng Google"
          facebookLabel="Đăng nhập bằng Facebook"
          googleBusyLabel="Đang chuyển đến Google..."
          facebookBusyLabel="Đang chuyển đến Facebook..."
          onError={(message) => setErrors({ form: message })}
          onBusyChange={setOauthBusy}
        />
        <Link to="/" className="block text-center text-sm text-text-muted hover:text-accent-yellow">
          ← Về trang chủ
        </Link>
      </form>
    </AuthCard>
  )
}
