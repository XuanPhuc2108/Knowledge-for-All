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
        className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[min(90vw,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-yellow/[0.08] blur-3xl"
        aria-hidden="true"
      />

      <FadeIn className="glass-card relative z-10 mx-auto max-w-4xl rounded-[2rem] px-5 py-12 text-center sm:px-10 sm:py-16">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-yellow">SÁCH HAY THÌ CHUYỀN TAY NHA</p>
        <h2
          className="mx-auto mb-8 max-w-3xl font-black tracking-tight text-text-primary"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
        >
          Kệ sách có cuốn nào muốn share hông?
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          <GradientButton onClick={() => navigate(user ? '/app/add-book' : '/register')}>
            {user ? 'Đăng sách liền' : 'Vô hội Booki'}
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
