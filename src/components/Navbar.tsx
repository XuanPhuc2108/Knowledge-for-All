import clsx from 'clsx'
import { BookOpen, LogIn, Plus, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuthState'
import { APP_NAME } from '../lib/constants'
import { Button } from './Button'
import { GradientButton } from './GradientButton'
import { MobileMenu } from './MobileMenu'

const NAV_LINKS = [{ href: '#upload', label: 'Đăng sách', action: 'upload' as const }]

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
          'site-header fixed left-0 right-0 top-0 z-50 transition-[background-color,border-color] duration-200',
          scrolled || variant === 'app'
            ? 'border-b border-glass/15 bg-dark/92 shadow-[0_8px_28px_rgb(0_0_0_/_0.16)] backdrop-blur-2xl'
            : 'bg-transparent',
        )}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-16">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-text-primary">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent-yellow/20 bg-accent-yellow/10">
              <BookOpen className="h-5 w-5 text-accent-yellow" />
            </span>
            <span className="hidden text-sm font-black tracking-[-0.045em] sm:inline sm:text-base">
              {APP_NAME}
            </span>
          </Link>

          {variant === 'landing' && (
            <>
              <Link to="/explore" className="landing-explore-link md:hidden">
                Khám phá
              </Link>
              <ul className="hidden items-center gap-5 md:flex">
                <li>
                  <Link to="/explore" className="landing-explore-link">
                    Khám phá sách
                  </Link>
                </li>
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <button
                      type="button"
                      onClick={() => navigate(user ? '/app/add-book' : '/register')}
                      className="landing-nav-link text-sm text-text-muted transition-colors duration-150 hover:text-text-primary"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <Link to="/app/profile" className="max-w-40 truncate text-sm font-medium text-text-primary transition-colors hover:text-accent-yellow">
                  {user.fullName}
                </Link>
                <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => void handleLogout()}>
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
                  <Button variant="ghost" size="sm" className="whitespace-nowrap">
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
            className="rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.75)] p-2 text-text-primary transition-colors hover:bg-[rgb(var(--color-interactive-hover)/.9)] md:hidden"
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
