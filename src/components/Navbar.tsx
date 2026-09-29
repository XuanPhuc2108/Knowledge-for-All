import clsx from 'clsx'
import { BookOpen, LogIn, Plus, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuthState'
import { APP_NAME } from '../lib/constants'
import { GsapMorphText } from './GsapMorphText'
import { Button } from './Button'
import { GradientButton } from './GradientButton'
import { MobileMenu } from './MobileMenu'

const NAV_LINKS = [
  { href: '#how-it-works', label: 'Cách hoạt động' },
  { href: '#location', label: 'Định vị' },
  { href: '#upload', label: 'Đăng sách', action: 'upload' as const },
  { href: '#safety', label: 'An toàn' },
]

export function Navbar({ variant = 'landing' }: { variant?: 'landing' | 'app' }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        setScrolled(window.scrollY > 20)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <>
      <header
        className={clsx(
          'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
          scrolled || variant === 'app'
            ? 'border-b border-glass bg-dark/80 backdrop-blur-xl'
            : 'bg-transparent',
        )}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-text-primary">
            <BookOpen className="h-6 w-6 shrink-0 text-accent-yellow" />
            <GsapMorphText
              text={APP_NAME}
              splitBy="word"
              reveal="none"
              morph
              className="hidden text-sm font-black uppercase tracking-tighter sm:inline sm:text-base"
            />
          </Link>

          {variant === 'landing' && (
            <ul className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  {link.action === 'upload' && user ? (
                    <button
                      type="button"
                      onClick={() => navigate('/app/add-book')}
                      className="text-sm text-text-muted transition-all duration-500 ease-awwwards hover:text-text-primary hover:underline hover:decoration-accent-yellow hover:underline-offset-4"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <a
                      href={link.href}
                      className="text-sm text-text-muted transition-all duration-500 ease-awwwards hover:text-text-primary hover:underline hover:decoration-accent-yellow hover:underline-offset-4"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}

          {variant === 'app' && user && (
            <ul className="hidden items-center gap-4 lg:flex">
              <li>
                <Link to="/app/add-book" className="text-sm text-text-muted hover:text-accent-yellow">
                  Đăng sách
                </Link>
              </li>
              <li>
                <Link to="/app/nearby" className="text-sm text-text-muted hover:text-accent-yellow">
                  Sách gần bạn
                </Link>
              </li>
              <li>
                <Link to="/app/my-books" className="text-sm text-text-muted hover:text-accent-yellow">
                  Sách của tôi
                </Link>
              </li>
            </ul>
          )}

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <span className="text-sm font-medium text-text-primary">{user.fullName}</span>
                <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
                  Đăng xuất
                </Button>
                <GradientButton
                  onClick={() => navigate('/app/add-book')}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Đăng sách
                </GradientButton>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    <LogIn className="h-4 w-4" />
                    Đăng nhập
                  </Button>
                </Link>
                <GradientButton href="/register" icon={<UserPlus className="h-4 w-4" />}>
                  Đăng ký
                </GradientButton>
              </>
            )}
          </div>

          <button
            className="md:hidden rounded-lg p-2 text-text-primary hover:bg-white/10"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </nav>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        user={user}
        onLogout={() => void handleLogout()}
        variant={variant}
      />
    </>
  )
}
