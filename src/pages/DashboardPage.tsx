import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookCard } from '../components/BookCard'
import { EmptyState } from '../components/EmptyState'
import { GradientButton } from '../components/GradientButton'
import { useAuth } from '../hooks/useAuthState'
import { useBooks } from '../hooks/useBooks'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useFavorites } from '../hooks/useFavorites'
import { BOOK_CATEGORIES, RADIUS_OPTIONS } from '../lib/constants'
import { haversineDistance } from '../lib/geo'
import { useToast } from '../hooks/useToast'
import type { BookStatus, ExchangeType } from '../types/book'

export function DashboardPage({ publicMode = false }: { publicMode?: boolean }) {
  const { user } = useAuth()
  const { books, loading, error, refetch } = useBooks()
  const { favoriteIds, loading: favoritesLoading, error: favoriteError, toggleFavorite } = useFavorites(user?.id)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ExchangeType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortNearby, setSortNearby] = useState(false)
  const [radius, setRadius] = useState<number>(Infinity)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const debouncedSearch = useDebouncedValue(search, 250)
  const hasLocation = Boolean(user?.locationEnabled && user.latitude !== undefined && user.longitude !== undefined)
  const latitude = user?.latitude
  const longitude = user?.longitude

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    let result = books.filter((book) => (
      (!q || book.title.toLowerCase().includes(q) || book.author?.toLowerCase().includes(q) || book.category.toLowerCase().includes(q)) &&
      (filter === 'all' || book.exchangeType === filter) &&
      (statusFilter === 'all' || book.status === statusFilter) &&
      (categoryFilter === 'all' || book.category === categoryFilter) &&
      (!favoritesOnly || favoriteIds.has(book.id))
    ))

    if (sortNearby && latitude !== undefined && longitude !== undefined) {
      result = result
        .map((book) => ({
          ...book,
          distanceMeters: book.latitude !== undefined && book.longitude !== undefined
            ? haversineDistance(latitude, longitude, book.latitude, book.longitude)
            : undefined,
        }))
        .filter((book) => radius === Infinity || (book.distanceMeters !== undefined && book.distanceMeters <= radius))
        .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    }
    return result
  }, [books, categoryFilter, debouncedSearch, favoritesOnly, favoriteIds, filter, latitude, longitude, radius, sortNearby, statusFilter])
  const availableCount = useMemo(
    () => books.filter((book) => book.status === 'available').length,
    [books],
  )

  const handleFavorite = async (bookId: string, currentlyFavorite: boolean) => {
    try {
      await toggleFavorite(bookId)
      showToast(currentlyFavorite ? 'Đã bỏ khỏi yêu thích' : 'Đã lưu vào yêu thích', 'success')
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Không thể cập nhật yêu thích', 'error')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setFilter('all')
    setStatusFilter('all')
    setCategoryFilter('all')
    setFavoritesOnly(false)
    setSortNearby(false)
    setRadius(Infinity)
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-yellow">{publicMode ? 'THƯ VIỆN BOOKI' : 'THƯ VIỆN CỘNG ĐỒNG'}</p>
          <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Khám phá sách</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">Tìm cuốn sách tiếp theo, xem tình trạng và kết nối với người chia sẻ.</p>
        </div>
        <GradientButton onClick={() => navigate(user ? '/app/add-book' : '/register')}>{user ? '+ Đăng sách' : 'Tham gia Booki'}</GradientButton>
      </div>

      <section aria-label="Tổng quan sách" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-text-muted">Bài đăng đang hiển thị</p>
          <p className="mt-1 text-2xl font-black text-text-primary">{books.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-text-muted">Có thể kết nối ngay</p>
          <p className="mt-1 text-2xl font-black text-accent-yellow">{availableCount}</p>
        </div>
        <div className="glass-card col-span-2 rounded-2xl p-4 sm:col-span-1">
          <p className="text-xs text-text-muted">Kết quả theo bộ lọc</p>
          <p className="mt-1 text-2xl font-black text-text-primary">{filtered.length}</p>
        </div>
      </section>

      <section className="glass-card mb-4 grid gap-3 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:p-4" aria-label="Tìm và lọc sách">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            placeholder="Tìm theo tên sách, tác giả, thể loại..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field-control py-3 pl-10 pr-4 text-sm"
          />
        </div>
        <CategoryFilterDropdown
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <select
          aria-label="Lọc theo tình trạng"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as BookStatus | 'all')}
          className="field-control min-w-36 px-3 py-3 text-sm"
        >
          <option value="all">Mọi tình trạng</option>
          <option value="available">Có sẵn</option>
          <option value="loaned">Đang cho mượn</option>
          <option value="exchanged">Đã trao đổi</option>
        </select>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(['all', 'share', 'exchange', 'borrow'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`filter-chip rounded-full px-3.5 py-2 text-xs font-semibold sm:text-sm ${filter === value ? 'border-accent-yellow/40 bg-accent-yellow/10 text-accent-yellow' : ''}`}
          >
            {value === 'all' ? 'Tất cả hình thức' : value === 'share' ? 'Chia sẻ' : value === 'exchange' ? 'Trao đổi' : 'Cho mượn'}
          </button>
        ))}
        {user && (
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((value) => !value)}
            className={`filter-chip rounded-full px-3.5 py-2 text-xs font-semibold sm:text-sm ${favoritesOnly ? 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose' : ''}`}
          >
            {favoritesOnly ? 'Đang xem yêu thích' : 'Yêu thích'}
          </button>
        )}
        {hasLocation ? (
          <>
            <button
              type="button"
              aria-pressed={sortNearby}
              onClick={() => setSortNearby((value) => !value)}
              className={`filter-chip rounded-full px-3.5 py-2 text-xs font-semibold sm:text-sm ${sortNearby ? 'border-accent-teal/30 bg-accent-teal/10 text-accent-teal' : ''}`}
            >
              Gần tôi nhất
            </button>
            {sortNearby && (
              <select
                aria-label="Khoảng cách tối đa"
                value={String(radius)}
                onChange={(event) => setRadius(Number(event.target.value))}
                className="field-control w-auto rounded-full px-3 py-2 text-sm"
              >
                {RADIUS_OPTIONS.map((option) => <option key={option.label} value={String(option.value)}>{option.label}</option>)}
              </select>
            )}
          </>
        ) : (
          <Link to={user ? '/app/settings#location' : '/login'} className="filter-chip rounded-full px-3.5 py-2 text-xs sm:text-sm">
            Bật định vị để lọc theo khoảng cách
          </Link>
        )}
      </div>

      {favoriteError && (
        <p className="mb-4 rounded-lg bg-accent-rose/10 p-3 text-sm text-accent-rose" role="alert">
          Không tải được danh sách yêu thích: {favoriteError}
        </p>
      )}
      {loading ? (
        <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" /></div>
      ) : error ? (
        <EmptyState title="Không thể tải danh sách sách" description={error} actionLabel="Thử lại" onAction={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={favoritesOnly ? 'Chưa có sách yêu thích phù hợp' : 'Không tìm thấy sách phù hợp'}
          description={favoritesOnly ? 'Lưu một bài đăng vào yêu thích để xem lại tại đây.' : 'Thử đổi từ khóa, trạng thái hoặc thể loại để mở rộng kết quả.'}
          actionLabel="Xóa bộ lọc"
          onAction={clearFilters}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              actionLabel="Xem chi tiết"
              onAction={() => navigate(user ? `/app/books/${book.id}` : `/books/${book.id}`)}
              isFavorite={favoriteIds.has(book.id)}
              onFavorite={user && !favoritesLoading ? () => void handleFavorite(book.id, favoriteIds.has(book.id)) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryFilterDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const options = [
    { label: 'Mọi thể loại', value: 'all' },
    ...BOOK_CATEGORIES.map((category) => ({ label: category, value: category })),
  ]
  const selectedIndex = options.findIndex((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  const openOptions = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    const roomBelow = rect ? window.innerHeight - rect.bottom : window.innerHeight
    const roomAbove = rect?.top ?? 0
    setOpenUp(roomBelow < Math.min(280, window.innerHeight * 0.45) && roomAbove > roomBelow)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  const chooseOption = (index: number) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        openOptions()
        return
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + direction + options.length) % options.length)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      if (!open) openOptions()
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
      return
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault()
      chooseOption(activeIndex)
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative min-w-36"
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
        } else if (!event.relatedTarget) {
          window.setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement)) setOpen(false)
          }, 0)
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label="Lọc theo thể loại"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="category-filter-options"
        aria-activedescendant={open ? `category-filter-option-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openOptions())}
        onKeyDown={handleKeyDown}
        className="field-control flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-[border-color,background-color,box-shadow] duration-150 hover:border-glass/20 focus-visible:border-accent-yellow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow/20"
      >
        <span>{options[selectedIndex]?.label ?? 'Mọi thể loại'}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-150 ${open ? 'rotate-180 text-accent-yellow' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="category-filter-options"
            role="listbox"
            aria-label="Thể loại sách"
            initial={{ opacity: 0, y: openUp ? 2 : -2, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUp ? 2 : -2, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={`absolute z-50 max-h-[min(18rem,45dvh)] w-full overflow-y-auto overscroll-contain rounded-[13px] border border-glass/10 bg-[rgb(var(--color-dark-secondary)/.97)] p-1.5 shadow-[0_18px_42px_rgb(0_0_0_/_0.3)] backdrop-blur-xl ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          >
            {options.map((option, index) => {
              const selected = option.value === value
              const active = index === activeIndex
              return (
                <div
                  key={option.value}
                  id={`category-filter-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseOption(index)}
                  className={`flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-[background-color,color] duration-150 ${
                    selected
                      ? 'bg-accent-yellow/[0.11] font-medium text-accent-yellow'
                      : active
                        ? 'bg-accent-yellow/[0.07] text-text-primary'
                        : 'text-text-muted hover:bg-accent-yellow/[0.07] hover:text-text-primary'
                  }`}
                >
                  <span>{option.label}</span>
                  {selected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-yellow" />}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
