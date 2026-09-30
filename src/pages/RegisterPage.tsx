import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { GradientButton } from '../components/GradientButton'
import { OAuthButtons } from '../components/OAuthButtons'
import { useAuth } from '../hooks/useAuthState'
import { validateRegister } from '../lib/validation'

export function RegisterPage() {
  const { register, resendSignupConfirmation, user } = useAuth()
  const navigate = useNavigate()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (user) navigate('/app/add-book', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fullName = fd.get('fullName') as string
    const email = fd.get('email') as string
    const password = fd.get('password') as string
    const confirmPassword = fd.get('confirmPassword') as string

    const validationErrors = validateRegister(fullName, email, password, confirmPassword)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    setNotice(null)
    setPendingEmail(null)
    setLoading(true)
    try {
      const profile = await register(fullName, email, password)
      if (!profile) {
        setNotice('Tài khoản đã được tạo. Vui lòng kiểm tra email để xác nhận trước khi đăng nhập.')
        setPendingEmail(email.trim().toLowerCase())
        return
      }
      navigate('/app/add-book')
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Đăng ký thất bại' })
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!pendingEmail) return
    setResending(true)
    setErrors({})
    try {
      await resendSignupConfirmation(pendingEmail)
      setNotice('Đã gửi lại email xác nhận. Hãy kiểm tra thư đến và thư rác.')
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : 'Không thể gửi email xác nhận.' })
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthCard
      title="Đăng ký"
      subtitle="Tạo tài khoản để bắt đầu chia sẻ sách"
      footerText="Đã có tài khoản?"
      footerLink="/login"
      footerLinkLabel="Đăng nhập"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {notice && (
          <div className="space-y-2 text-sm text-accent-teal" role="status">
            <p>{notice}</p>
            {pendingEmail && (
              <button type="button" className="font-semibold underline underline-offset-2 disabled:opacity-60" disabled={resending} onClick={() => void handleResendConfirmation()}>
                {resending ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
              </button>
            )}
          </div>
        )}
        {errors.form && (
          <p className="text-sm text-accent-rose" role="alert">{errors.form}</p>
        )}
        {(['fullName', 'email', 'password', 'confirmPassword'] as const).map((field) => (
          <div key={field}>
            <label htmlFor={field} className="mb-1.5 block text-sm font-medium">
              {field === 'fullName' && 'Họ tên'}
              {field === 'email' && 'Email'}
              {field === 'password' && 'Mật khẩu'}
              {field === 'confirmPassword' && 'Xác nhận mật khẩu'}
            </label>
            <input
              id={field}
              name={field}
              type={field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
              required
              className="field-control px-4 py-3 text-sm"
            />
            {errors[field] && <p className="mt-1 text-xs text-accent-rose">{errors[field]}</p>}
          </div>
        ))}
        <GradientButton type="submit" disabled={loading || oauthBusy} className="w-full">
          {loading ? 'Đang đăng ký...' : 'Đăng ký'}
        </GradientButton>
        <OAuthButtons
          disabled={loading}
          googleLabel="Đăng ký bằng Google"
          facebookLabel="Đăng ký bằng Facebook"
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
