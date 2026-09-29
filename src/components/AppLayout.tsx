import clsx from 'clsx'
import { BookOpen, Home, MapPin, Plus, User } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuthState'
import { Navbar } from './Navbar'

const SIDEBAR_LINKS = [
  { to: '/app', icon: Home, label: 'Khám phá' },
  { to: '/app/add-book', icon: Plus, label: 'Đăng sách' },
  { to: '/app/nearby', icon: MapPin, label: 'Gần bạn' },
  { to: '/app/my-books', icon: BookOpen, label: 'Sách của tôi' },
  { to: '/app/profile', icon: User, label: 'Hồ sơ' },
]

export function AppLayout() {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-dark">
      <Navbar variant="app" />
      <div className="mx-auto flex max-w-7xl gap-6 px-5 pb-24 pt-24 lg:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-28 space-y-1">
            {SIDEBAR_LINKS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  location.pathname === to || (to !== '/app' && location.pathname.startsWith(to))
                    ? 'bg-white/10 text-accent-yellow'
                    : 'text-text-muted hover:bg-white/5 hover:text-text-primary',
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
            <p className="mb-6 text-text-muted">
              Xin chào, <span className="font-semibold text-text-primary">{user.fullName}</span>
            </p>
          )}
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-glass bg-dark/95 backdrop-blur-xl lg:hidden">
        <div className="flex justify-around py-2">
          {SIDEBAR_LINKS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                'flex flex-col items-center gap-1 px-2 py-1 text-[10px]',
                location.pathname === to ? 'text-accent-yellow' : 'text-text-muted',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
