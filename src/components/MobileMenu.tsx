import { AnimatePresence, motion } from 'framer-motion'
import { LogIn, Plus, Search, UserPlus, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { useReducedMotion } from '../hooks/useReducedMotion'
import type { UserProfile } from '../types/user'
import { Button } from './Button'
import { GradientButton } from './GradientButton'

const LANDING_LINKS = [
  { href: '#how-it-works', label: 'Cách hoạt động' },
  { href: '#location', label: 'Định vị' },
  { href: '#upload', label: 'Đăng sách' },
  { href: '#safety', label: 'An toàn' },
]

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  user: UserProfile | null
  onLogout: () => void
  variant: 'landing' | 'app'
  soundEnabled: boolean
  onToggleSound: () => void
}

export function MobileMenu({ open, onClose, user, onLogout, variant, soundEnabled, onToggleSound }: MobileMenuProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const prefersReducedMotion = useReducedMotion()
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = document.querySelectorAll<HTMLElement>(
        '#mobile-navigation-menu a[href], #mobile-navigation-menu button:not(:disabled)',
      )
      const first = focusable.item(0)
      const last = focusable.item(focusable.length - 1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [open, onClose])

  useEffect(() => {
    onClose()
  }, [location.pathname, location.search, location.hash, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-dark/80 md:hidden"
            onClick={onClose}
          />
          <motion.div
            id="mobile-navigation-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            initial={prefersReducedMotion ? false : { y: '-100%' }}
            animate={{ y: 0 }}
            exit={prefersReducedMotion ? undefined : { y: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="mobile-menu-panel fixed left-0 right-0 top-0 z-[70] flex flex-col border-b border-glass/10 bg-dark-secondary shadow-[0_24px_70px_rgb(0_0_0_/_0.3)] md:hidden"
          >
            <div className="mobile-menu-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-bold text-text-primary">Menu</span>
                <button ref={closeButtonRef} onClick={onClose} aria-label="Đóng menu" className="min-h-11 min-w-11 rounded-xl bg-[rgb(var(--color-interactive-surface)/.8)] p-2 transition-colors hover:bg-[rgb(var(--color-interactive-hover)/.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow">
                  <X className="mx-auto h-6 w-6" />
                </button>
              </div>

              <ul className="space-y-1.5">
              {variant === 'landing' &&
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        window.dispatchEvent(new Event('booki:open-command-palette'))
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-accent-yellow transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)]"
                    >
                      <Search className="h-4 w-4" aria-hidden="true" />
                      Tìm sách nhanh
                    </button>
                  </li>
                  <li>
                    <Link
                      to={user ? '/app' : '/'}
                      onClick={onClose}
                      className="block rounded-xl px-3 py-2.5 text-base font-semibold text-text-primary transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)]"
                    >
                      Trang chủ
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/explore"
                      onClick={onClose}
                      className="landing-explore-menu-link block rounded-xl px-3 py-2.5 text-base font-bold text-accent-yellow transition-colors"
                    >
                      Khám phá
                    </Link>
                  </li>
                  {LANDING_LINKS.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        onClick={onClose}
                        className="block rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </>
                }

              {user && (
                <>
                  <li className="mb-2 border-b border-glass/10 px-3 pb-3 text-sm font-semibold text-accent-yellow">{user.fullName}</li>
                  <li>
                    <Link to="/app/add-book" onClick={onClose} className="block rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary">
                      Đăng sách
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/nearby" onClick={onClose} className="block rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary">
                      Sách gần bạn
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/my-books" onClick={onClose} className="block rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary">
                      Sách của tôi
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/requests" onClick={onClose} className="block rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary">
                      Lời nhắn & đề nghị
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/profile" onClick={onClose} className="block rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary">
                      Hồ sơ
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/settings" onClick={onClose} className="block rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary">
                      Cài đặt
                    </Link>
                  </li>
                </>
              )}
              <li>
                <button
                  type="button"
                  data-sound="off"
                  aria-pressed={soundEnabled}
                  onClick={onToggleSound}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary"
                >
                  {soundEnabled
                    ? <Volume2 className="h-4 w-4" aria-hidden="true" />
                    : <VolumeX className="h-4 w-4" aria-hidden="true" />}
                  {soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                </button>
              </li>
              </ul>

              <div className="mt-6 flex flex-col gap-3">
              {user ? (
                <>
                  <GradientButton
                    className="w-full"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => {
                      onClose()
                      navigate('/app/add-book')
                    }}
                  >
                    Đăng sách
                  </GradientButton>
                  <Button variant="outline" className="w-full" onClick={() => { onLogout(); onClose() }}>
                    Đăng xuất
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={onClose}>
                    <Button variant="outline" className="w-full">
                      <LogIn className="h-4 w-4" /> Đăng nhập
                    </Button>
                  </Link>
                  <GradientButton
                    className="w-full"
                    icon={<UserPlus className="h-4 w-4" />}
                    onClick={() => {
                      onClose()
                      navigate('/register')
                    }}
                  >
                    Đăng ký
                  </GradientButton>
                </>
              )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
