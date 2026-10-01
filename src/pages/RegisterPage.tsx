import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { GradientButton } from '../components/GradientButton'
import { OAuthButtons } from '../components/OAuthButtons'
import { useAuth } from '../hooks/useAuthState'
import { validateRegister } from '../lib/validation'
import { userFacingError } from '../lib/userFacingError'

export function RegisterPage() {
  const { register, verifySignupOtp, resendSignupConfirmation, user } = useAuth()
  const navigate = useNavigate()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)

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
    setOtp('')
    setLoading(true)
    try {
      const profile = await register(fullName, email, password)
      if (!profile) {
        setNotice('Mã OTP đã được gửi tới email của bạn. Nhập mã bên dưới để xác nhận tài khoản.')
        setPendingEmail(email.trim().toLowerCase())
        return
      }
      navigate('/app/add-book')
    } catch (e) {
      console.error('Unable to complete registration', e)
      setErrors({ form: userFacingError(e, 'Chưa thể tạo tài khoản. Hãy thử lại nha.') })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!pendingEmail) return
    if (!/^\d{6}$/.test(otp.trim())) {
      setErrors({ otp: 'Mã OTP gồm 6 chữ số nha.' })
      return
    }
    setVerifying(true)
    setErrors({})
    try {
      await verifySignupOtp(pendingEmail, otp.trim())
      navigate('/app/add-book')
    } catch (cause) {
      console.error('Unable to verify the signup code', cause)
      setErrors({ otp: userFacingError(cause, 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.') })
    } finally {
      setVerifying(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!pendingEmail) return
    setResending(true)
    setErrors({})
    try {
      await resendSignupConfirmation(pendingEmail)
      setNotice('Đã gửi lại mã OTP. Vui lòng kiểm tra hộp thư đến và thư rác.')
    } catch (cause) {
      console.error('Unable to resend the account confirmation email', cause)
      setErrors({ form: userFacingError(cause, 'Chưa thể gửi email xác nhận. Hãy thử lại nha.') })
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthCard
      title="Đăng ký"
      subtitle="Tạo tài khoản để đăng sách, lưu cuốn yêu thích và kết nối với cộng đồng đọc sách."
      footerText="Đã có tài khoản?"
      footerLink="/login"
      footerLinkLabel="Đăng nhập"
    >
      <form onSubmit={(event) => {
        if (pendingEmail) {
          event.preventDefault()
          void handleVerifyOtp()
        } else {
          void handleSubmit(event)
        }
      }} className="space-y-4">
        {notice && <p className="text-sm text-accent-teal" role="status">{notice}</p>}
        {pendingEmail && (
          <button type="button" className="text-sm font-semibold text-accent-yellow underline underline-offset-2 disabled:opacity-60" disabled={resending} onClick={() => void handleResendConfirmation()}>
            {resending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
          </button>
        )}
        {errors.form && (
          <p className="text-sm text-accent-rose" role="alert">{errors.form}</p>
        )}
        {!pendingEmail && (['fullName', 'email', 'password', 'confirmPassword'] as const).map((field) => (
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
        {!pendingEmail && (
          <>
            <GradientButton type="submit" disabled={loading || oauthBusy} className="w-full">
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
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
          </>
        )}
        {pendingEmail && (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-text-muted">
              Mã được gửi tới <span className="font-semibold text-text-primary">{pendingEmail}</span>. Hãy kiểm tra cả mục thư rác nếu chưa thấy email.
            </p>
            <div>
              <label htmlFor="signup-otp" className="mb-1.5 block text-sm font-medium">Mã OTP 6 số</label>
              <input
                id="signup-otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="field-control px-4 py-3 text-center text-lg font-bold tracking-[0.4em]"
                aria-describedby={errors.otp ? 'signup-otp-error' : undefined}
              />
              {errors.otp && <p id="signup-otp-error" className="mt-1 text-xs text-accent-rose" role="alert">{errors.otp}</p>}
            </div>
            <GradientButton type="button" disabled={verifying || otp.length !== 6} className="w-full" onClick={() => void handleVerifyOtp()}>
              {verifying ? 'Đang xác nhận...' : 'Xác nhận email'}
            </GradientButton>
          </div>
        )}
        <Link to="/" className="block text-center text-sm text-text-muted hover:text-accent-yellow">
          ← Về trang chủ
        </Link>
      </form>
    </AuthCard>
  )
}
