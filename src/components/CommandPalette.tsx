import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Clock3,
  Heart,
  MapPin,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppSettings } from '../hooks/useAppSettings'
import { useAuth } from '../hooks/useAuthState'
import type { AppTheme } from '../hooks/appSettingsTypes'
import { normalizeBookSearch } from '../lib/search'

interface RecentBook {
  id: string
  title: string
  category: string
}

interface PaletteAction {
  label: string
  keywords: string
  group: string
  icon: typeof Search
  run: () => void
  shortcut?: string
}

const RECENT_BOOKS_KEY = 'booki_recent_books'
const OPEN_EVENT = 'booki:open-command-palette'

function readRecentBooks(): RecentBook[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_BOOKS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is RecentBook => (
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'title' in item &&
      'category' in item &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.category === 'string'
    )).slice(0, 5)
  } catch (cause) {
    console.warn('Unable to read recently viewed books for command search', cause)
    return []
  }
}

export function CommandPalette() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { settings, setSettings } = useAppSettings()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentBooks] = useState(readRecentBooks)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const close = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  useEffect(() => {
    const show = () => {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setQuery('')
      setActiveIndex(0)
      setOpen(true)
    }
    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        show()
      }
    }
    window.addEventListener('keydown', onShortcut)
    window.addEventListener(OPEN_EVENT, show)
    return () => {
      window.removeEventListener('keydown', onShortcut)
      window.removeEventListener(OPEN_EVENT, show)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      previousFocusRef.current?.focus()
      return
    }
    inputRef.current?.focus()
  }, [open])

  const actions = useMemo<PaletteAction[]>(() => {
    const targetBase = user ? '/app' : '/explore'
    const nextTheme: AppTheme = settings.theme === 'light' ? 'dark' : 'light'
    const list: PaletteAction[] = [
      {
        label: 'Tìm sách',
        keywords: 'tìm kiếm search sách book',
        group: 'Khám phá',
        icon: Search,
        shortcut: '/',
        run: () => navigate(query.trim()
          ? `${targetBase}?q=${encodeURIComponent(query.trim())}`
          : targetBase),
      },
      {
        label: 'Khám phá sách',
        keywords: 'khám phá browse explore tất cả sách',
        group: 'Khám phá',
        icon: BookOpen,
        run: () => navigate(targetBase),
      },
      {
        label: 'Đổi giao diện Sáng/Tối',
        keywords: 'theme giao diện sáng tối dark light',
        group: 'Giao diện',
        icon: settings.theme === 'light' ? Moon : Sun,
        run: () => setSettings((current) => ({ ...current, theme: nextTheme })),
      },
      {
        label: 'Mở giao diện Aurora',
        keywords: 'theme giao diện aurora màu tím',
        group: 'Giao diện',
        icon: Sun,
        run: () => setSettings((current) => ({ ...current, theme: 'aurora' })),
      },
      ...recentBooks.map((book): PaletteAction => ({
        label: book.title,
        keywords: `${book.category} sách vừa xem recently viewed`,
        group: 'Vừa xem',
        icon: Clock3,
        run: () => navigate(`${user ? '/app' : ''}/books/${encodeURIComponent(book.id)}`),
      })),
    ]
    if (user) {
      list.splice(2, 0,
        {
          label: 'Sách gần bạn',
          keywords: 'gần đây quanh quanh nearby vị trí',
          group: 'Tài khoản',
          icon: MapPin,
          run: () => navigate('/app/nearby'),
        },
        {
          label: 'Sách của tôi',
          keywords: 'bài đăng của tôi my books',
          group: 'Tài khoản',
          icon: BookOpen,
          run: () => navigate('/app/my-books'),
        },
        {
          label: 'Sách yêu thích',
          keywords: 'đã lưu yêu thích favorites',
          group: 'Tài khoản',
          icon: Heart,
          run: () => navigate('/app?favorite=1'),
        },
        {
          label: 'Hồ sơ',
          keywords: 'profile thông tin cá nhân',
          group: 'Tài khoản',
          icon: UserRound,
          run: () => navigate('/app/profile'),
        },
        {
          label: 'Cài đặt',
          keywords: 'settings tùy chỉnh',
          group: 'Tài khoản',
          icon: Settings,
          run: () => navigate('/app/settings'),
        },
        {
          label: 'Đăng sách',
          keywords: 'thêm đăng bài sách mới',
          group: 'Tài khoản',
          icon: Plus,
          run: () => navigate('/app/add-book'),
        },
      )
    }
    if (query.trim()) {
      list.unshift({
        label: `Tìm sách “${query.trim()}”`,
        keywords: query,
        group: 'Tìm kiếm',
        icon: Search,
        run: () => navigate(`${targetBase}?q=${encodeURIComponent(query.trim())}`),
      })
    }
    return list
  }, [navigate, query, recentBooks, setSettings, settings.theme, user])

  const normalizedQuery = normalizeBookSearch(query)
  const filteredActions = useMemo(() => actions.filter((action) => (
    !normalizedQuery ||
    normalizeBookSearch(`${action.label} ${action.keywords}`).includes(normalizedQuery)
  )), [actions, normalizedQuery])
  const groups = useMemo(() => [...new Set(filteredActions.map((action) => action.group))], [filteredActions])
  const currentRoute = `${location.pathname}${location.search}`

  const execute = (action: PaletteAction) => {
    action.run()
    if (action.group === 'Giao diện') return
    close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (filteredActions.length === 0) return
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) => (index + delta + filteredActions.length) % filteredActions.length)
      return
    }
    if (event.key === 'Enter' && filteredActions[activeIndex]) {
      event.preventDefault()
      execute(filteredActions[activeIndex])
      return
    }
    if (event.key === 'Tab' && dialogRef.current) {
      const elements = dialogRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [href]',
      )
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-dark/70 px-4 pb-[env(safe-area-inset-bottom)] pt-[min(16vh,7rem)] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tìm nhanh trên Booki"
            className="command-palette glass-card w-full max-w-xl overflow-hidden rounded-2xl border border-glass/15 shadow-[0_28px_90px_rgb(0_0_0_/_0.42)]"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-glass/10 px-4">
              <Search className="h-5 w-5 shrink-0 text-accent-yellow" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                placeholder="Tìm sách hoặc mở nhanh..."
                aria-label="Tìm lệnh"
                className="min-h-14 min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <button type="button" onClick={close} aria-label="Đóng tìm nhanh" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[min(60dvh,28rem)] overflow-y-auto p-2" aria-live="polite">
              {filteredActions.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-text-muted">Chưa có mục nào khớp. Thử từ khóa khác.</p>
              ) : (
                groups.map((group) => (
                  <section key={group} aria-label={group} className="mb-2 last:mb-0">
                    <h2 className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">{group}</h2>
                    {filteredActions.map((action, index) => {
                      if (action.group !== group) return null
                      const Icon = action.icon
                      return (
                        <button
                          key={`${action.group}:${action.label}`}
                          type="button"
                          aria-current={currentRoute === '/app' && action.label === 'Khám phá sách' ? 'page' : undefined}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => execute(action)}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                            index === activeIndex
                              ? 'bg-accent-yellow/10 text-text-primary'
                              : 'text-text-muted hover:bg-[rgb(var(--color-interactive-surface)/.75)] hover:text-text-primary'
                          }`}
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[rgb(var(--color-interactive-surface)/.8)] text-accent-yellow">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{action.label}</span>
                          {action.shortcut && <kbd className="rounded border border-glass/10 px-1.5 py-0.5 text-[10px] text-text-muted">{action.shortcut}</kbd>}
                        </button>
                      )
                    })}
                  </section>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-glass/10 px-4 py-2.5 text-[10px] text-text-muted">
              <span>↑↓ chọn · Enter mở · Ctrl/⌘ K tìm nhanh</span>
              <span>Esc đóng</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
