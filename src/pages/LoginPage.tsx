import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { GradientButton } from '../components/GradientButton'
import { OAuthButtons } from '../components/OAuthButtons'
import { useAuth } from '../hooks/useAuthState'
import { validateLogin } from '../lib/validation'

export function LoginPage() {
  const { login, resendSignupConfirmation, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/app'
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null)

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
      const message = e instanceof Error ? e.message : 'Đăng nhập thất bại'
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
      setConfirmationNotice('Đã gửi lại email xác nhận. Hãy kiểm tra thư đến và thư rác.')
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : 'Không thể gửi email xác nhận.' })
    } finally {
      setResendingConfirmation(false)
    }
  }

  return (
    <AuthCard
      title="Đăng nhập"
      subtitle="Chào mừng trở lại Booki"
      footerText="Chưa có tài khoản?"
      footerLink="/register"
      footerLinkLabel="Đăng ký ngay"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {confirmationNotice && <p className="text-sm text-accent-teal" role="status">{confirmationNotice}</p>}
        {errors.form && (
          <div className="space-y-2 text-sm" role="alert">
            <p className="text-accent-rose">{errors.form}</p>
            {confirmationEmail && (
              <button type="button" className="font-semibold text-accent-yellow underline underline-offset-2 disabled:opacity-60" disabled={resendingConfirmation} onClick={() => void handleResendConfirmation()}>
                {resendingConfirmation ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
              </button>
            )}
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
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
            required
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
