import clsx from 'clsx'
import { BookOpen, Home, Inbox, MapPin, Plus, Settings, ShieldAlert, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuthState'
import { getAdapter } from '../lib/dataAdapter'
import type { AppRole } from '../lib/dataAdapter'
import { Navbar } from './Navbar'

const SIDEBAR_LINKS = [
  { to: '/app', icon: Home, label: 'Khám phá' },
  { to: '/app/add-book', icon: Plus, label: 'Đăng sách' },
  { to: '/app/nearby', icon: MapPin, label: 'Gần bạn' },
  { to: '/app/my-books', icon: BookOpen, label: 'Sách của tôi' },
  { to: '/app/requests', icon: Inbox, label: 'Lời nhắn' },
  { to: '/app/profile', icon: User, label: 'Hồ sơ' },
  { to: '/app/settings', icon: Settings, label: 'Cài đặt' },
]

const MOBILE_LINKS = SIDEBAR_LINKS.filter((link) => link.to !== '/app/add-book')

export interface AppLayoutContext {
  role: AppRole | null
  roleError: string | null
}

export function AppLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const [roleState, setRoleState] = useState<{
    userId: string
    role: AppRole
    error: null
  } | {
    userId: string
    role: null
    error: string
  } | null>(null)
  const userId = user?.id

  useEffect(() => {
    let cancelled = false
    if (!userId) return () => { cancelled = true }
    void getAdapter().getMyAppRole(userId)
      .then((nextRole) => {
        if (!cancelled) setRoleState({ userId, role: nextRole, error: null })
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setRoleState({
            userId,
            role: null,
            error: 'Chưa thể xác định quyền truy cập. Hãy thử tải lại trang.',
          })
          console.error('Unable to load trusted application role', cause)
        }
      })
    return () => { cancelled = true }
  }, [userId])

  const role = roleState && roleState.userId === user?.id ? roleState.role : null
  const roleError = roleState && roleState.userId === user?.id ? roleState.error : null
  const staff = role !== null && role !== 'user'
  const sidebarLinks = staff
    ? [...SIDEBAR_LINKS, { to: '/app/moderation', icon: ShieldAlert, label: 'Kiểm duyệt' }]
    : SIDEBAR_LINKS
  const mobileLinks = staff
    ? [...MOBILE_LINKS, { to: '/app/moderation', icon: ShieldAlert, label: 'Kiểm duyệt' }]
    : MOBILE_LINKS

  return (
    <div className="app-shell min-h-screen bg-dark">
      <Navbar variant="app" />
      <div className="mx-auto flex max-w-[1400px] gap-8 px-4 pb-28 pt-24 sm:px-6 lg:px-10">
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="app-sidebar glass-card sticky top-28 space-y-1 rounded-2xl p-2">
            {sidebarLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'app-sidebar-link flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-[background-color,color,transform] duration-200',
                  location.pathname === to || (to !== '/app' && location.pathname.startsWith(to))
                    ? 'is-active bg-accent-yellow/10 text-accent-yellow'
                    : 'text-text-muted hover:translate-x-0.5 hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary',
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {user && (
            <p className="mb-7 hidden text-sm text-text-muted sm:block">
              Xin chào, <span className="font-semibold text-text-primary">{user.fullName}</span>
            </p>
          )}
          <Outlet context={{ role, roleError } satisfies AppLayoutContext} />
        </main>
      </div>

      <nav className="app-mobile-nav fixed bottom-0 left-0 right-0 z-50 border-t border-glass/10 bg-dark/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_36px_rgb(0_0_0_/_0.16)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-xl justify-around px-2 py-2">
          {mobileLinks.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              aria-current={location.pathname === to ? 'page' : undefined}
              className={clsx(
                'app-mobile-nav-link flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-[background-color,color,transform] duration-200',
                location.pathname === to ? 'is-active bg-accent-yellow/10 text-accent-yellow' : 'text-text-muted hover:text-text-primary',
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
