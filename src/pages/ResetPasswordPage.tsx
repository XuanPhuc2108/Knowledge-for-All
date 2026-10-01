import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { GradientButton } from '../components/GradientButton'
import { useAuth } from '../hooks/useAuthState'
import { userFacingError } from '../lib/userFacingError'
import { validatePassword } from '../lib/validation'

export function ResetPasswordPage() {
  const { passwordRecovery, completePasswordReset } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    const validationError = validatePassword(password)
    if (validationError) {
      setError(validationError)
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.')
      return
    }

    setSaving(true)
    try {
      await completePasswordReset(password)
      setNotice('Mật khẩu đã được cập nhật. Bạn có thể tiếp tục vào Booki.')
      window.setTimeout(() => navigate('/app', { replace: true }), 900)
    } catch (cause) {
      console.error('Unable to complete password recovery', cause)
      setError(userFacingError(cause, 'Chưa thể cập nhật mật khẩu. Hãy yêu cầu liên kết mới nha.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthCard
      title="Tạo mật khẩu mới"
      subtitle="Chọn mật khẩu mới để đăng nhập lại Booki."
    >
      {passwordRecovery ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          {notice && <p className="text-sm text-accent-teal" role="status">{notice}</p>}
          {error && <p className="text-sm text-accent-rose" role="alert">{error}</p>}
          <div>
            <label htmlFor="recovery-password" className="mb-1.5 block text-sm font-medium">Mật khẩu mới</label>
            <input
              id="recovery-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-control px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="recovery-confirm" className="mb-1.5 block text-sm font-medium">Nhập lại mật khẩu mới</label>
            <input
              id="recovery-confirm"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="field-control px-4 py-3 text-sm"
            />
          </div>
          <GradientButton type="submit" className="w-full" disabled={saving || Boolean(notice)}>
            {saving ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}
          </GradientButton>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="rounded-xl border border-accent-yellow/20 bg-accent-yellow/[0.06] p-3 text-sm leading-relaxed text-text-muted" role="status">
            Liên kết đặt lại mật khẩu không còn hiệu lực hoặc chưa được xác thực. Hãy xin liên kết mới từ trang đăng nhập.
          </p>
          <Link to="/login" className="block text-center text-sm font-semibold text-accent-yellow hover:underline">
            Về trang đăng nhập
          </Link>
        </div>
      )}
    </AuthCard>
  )
}
