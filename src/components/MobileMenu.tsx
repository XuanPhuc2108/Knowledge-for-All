import { AnimatePresence, motion } from 'framer-motion'
import { LogIn, Plus, Search, UserPlus, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
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
}

export function MobileMenu({ open, onClose, user, onLogout, variant }: MobileMenuProps) {
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-dark/75 backdrop-blur-md md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 right-0 top-0 z-[70] rounded-b-3xl border-b border-glass/10 bg-dark-secondary p-5 shadow-[0_24px_70px_rgb(0_0_0_/_0.3)] md:hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="font-bold text-text-primary">Menu</span>
              <button onClick={onClose} aria-label="Đóng menu" className="rounded-xl bg-[rgb(var(--color-interactive-surface)/.8)] p-2 transition-colors hover:bg-[rgb(var(--color-interactive-hover)/.9)]">
                <X className="h-6 w-6" />
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
            </ul>

            <div className="mt-8 flex flex-col gap-3">
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
