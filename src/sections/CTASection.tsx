import { useNavigate } from 'react-router-dom'
import { FadeIn } from '../components/FadeIn'
import { GradientButton } from '../components/GradientButton'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuthState'

export function CTASection() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <section className="relative overflow-hidden px-5 py-20 sm:px-8 md:py-32 lg:px-16">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(139,92,246,0.2), rgba(45,212,191,0.2))',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 animate-shine opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          backgroundSize: '200% 100%',
        }}
        aria-hidden="true"
      />

      <FadeIn className="relative z-10 mx-auto max-w-3xl text-center">
        <h2
          className="mb-8 font-black text-text-primary"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
        >
          Sẵn sàng chia sẻ quyển sách đầu tiên?
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          <GradientButton onClick={() => navigate(user ? '/app/add-book' : '/register')}>
            {user ? 'Đăng sách' : 'Đăng ký ngay'}
          </GradientButton>
          {!user && (
            <Button variant="outline" size="lg" onClick={() => navigate('/login')}>
              Đã có tài khoản
            </Button>
          )}
        </div>
      </FadeIn>
    </section>
  )
}
