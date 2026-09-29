import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { GradientButton } from '../components/GradientButton'
import { OAuthButtons } from '../components/OAuthButtons'
import { useAuth } from '../hooks/useAuthState'
import { validateLogin } from '../lib/validation'

export function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/app'
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)

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
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Đăng nhập thất bại' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Đăng nhập"
      subtitle="Chào mừng trở lại Knowledge for All"
      footerText="Chưa có tài khoản?"
      footerLink="/register"
      footerLinkLabel="Đăng ký ngay"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {errors.form && (
          <p className="text-sm text-accent-rose" role="alert">{errors.form}</p>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-glass bg-white/5 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-yellow"
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
            className="w-full rounded-xl border border-glass bg-white/5 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-yellow"
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
