import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Dices, Search, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BookCard } from '../components/BookCard'
import { EmptyState } from '../components/EmptyState'
import { GradientButton } from '../components/GradientButton'
import { useAuth } from '../hooks/useAuthState'
import { useBooks } from '../hooks/useBooks'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useFavorites } from '../hooks/useFavorites'
import { BOOK_CATEGORIES, RADIUS_OPTIONS } from '../lib/constants'
import { haversineDistance } from '../lib/geo'
import { normalizeBookSearch } from '../lib/search'
import { userFacingError } from '../lib/userFacingError'
import { useToast } from '../hooks/useToast'
import type { BookStatus, BookWithDistance, ExchangeType } from '../types/book'

const BookPreviewDialog = lazy(() => import('../components/BookPreviewDialog').then((module) => ({ default: module.BookPreviewDialog })))

interface RecentBook {
  id: string
  title: string
  category: string
}

function readRecentlyViewedBooks(): RecentBook[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('booki_recent_books') ?? '[]')
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
    console.warn('Unable to read recently viewed books for the discovery page', cause)
    return []
  }
}

function timeGreeting(hour: number): string {
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 17) return 'Chiều nay tìm sách gì?'
  return 'Tối rồi, kiếm cuốn hay ho đọc thôi'
}

function parseExchangeType(value: string | null): ExchangeType | 'all' {
  return value === 'share' || value === 'exchange' || value === 'borrow' ? value : 'all'
}

function parseCategory(value: string | null): string {
  return value && (BOOK_CATEGORIES as readonly string[]).includes(value) ? value : 'all'
}

function parseBookStatus(value: string | null): BookStatus | 'all' {
  return value === 'available' || value === 'loaned' || value === 'exchanged' ? value : 'all'
}

function parseRadius(value: string | null): number {
  const radius = Number(value)
  return RADIUS_OPTIONS.some((option) => option.value === radius) ? radius : Infinity
}

export function DashboardPage({ publicMode = false }: { publicMode?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const {
    books,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMoreError,
    loadMore,
    refetch,
  } = useBooks(24)
  const { favoriteIds, loading: favoritesLoading, error: favoriteError, toggleFavorite } = useFavorites(user?.id)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [previewBook, setPreviewBook] = useState<BookWithDistance | null>(null)
  const [recentlyViewed] = useState(readRecentlyViewedBooks)
  const search = searchParams.get('q') ?? ''
  const filter = parseExchangeType(searchParams.get('type'))
  const statusFilter = parseBookStatus(searchParams.get('status'))
  const categoryFilter = parseCategory(searchParams.get('category'))
  const sortNearby = searchParams.get('nearby') === '1'
  const radius = parseRadius(searchParams.get('radius'))
  const favoritesOnly = searchParams.get('favorite') === '1'
  const setFilterParam = useCallback((key: string, value: string | null) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value === null) next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }, [setSearchParams])
  const setSearch = useCallback((value: string) => setFilterParam('q', value || null), [setFilterParam])
  const setFilter = useCallback((value: ExchangeType | 'all') => setFilterParam('type', value === 'all' ? null : value), [setFilterParam])
  const setStatusFilter = useCallback((value: BookStatus | 'all') => setFilterParam('status', value === 'all' ? null : value), [setFilterParam])
  const setCategoryFilter = useCallback((value: string) => setFilterParam('category', value === 'all' ? null : value), [setFilterParam])
  const setSortNearby = useCallback((value: boolean) => setFilterParam('nearby', value ? '1' : null), [setFilterParam])
  const setRadius = useCallback((value: number) => setFilterParam('radius', value === Infinity ? null : String(value)), [setFilterParam])
  const setFavoritesOnly = useCallback((value: boolean) => setFilterParam('favorite', value ? '1' : null), [setFilterParam])
  const clearNearby = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('nearby')
      next.delete('radius')
      return next
    }, { replace: true })
  }, [setSearchParams])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebouncedValue(search, 250)
  const hasLocation = Boolean(user?.locationEnabled && user.latitude !== undefined && user.longitude !== undefined)
  const latitude = user?.latitude
  const longitude = user?.longitude

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
      )) return
      event.preventDefault()
      searchInputRef.current?.focus()
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  const filtered = useMemo(() => {
    const q = normalizeBookSearch(debouncedSearch)
    let result = books.filter((book) => (
      (!q || normalizeBookSearch(`${book.title} ${book.author ?? ''} ${book.category} ${book.description}`).includes(q)) &&
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
  const savedBooks = useMemo(
    () => books.filter((book) => favoriteIds.has(book.id)).slice(0, 4),
    [books, favoriteIds],
  )
  const suggestedCategories = useMemo(
    () => [...new Set(books.map((book) => book.category))]
      .filter((category) => category !== categoryFilter)
      .slice(0, 3),
    [books, categoryFilter],
  )
  const activeFilters = [
    search.trim() ? { label: `Từ khóa: ${search.trim()}`, clear: () => setSearch('') } : null,
    filter !== 'all' ? { label: `Hình thức: ${filter === 'share' ? 'Chia sẻ' : filter === 'exchange' ? 'Trao đổi' : 'Cho mượn'}`, clear: () => setFilter('all') } : null,
    statusFilter !== 'all' ? { label: `Tình trạng: ${statusFilter === 'available' ? 'Có sẵn' : statusFilter === 'loaned' ? 'Đang cho mượn' : 'Đã trao đổi'}`, clear: () => setStatusFilter('all') } : null,
    categoryFilter !== 'all' ? { label: `Thể loại: ${categoryFilter}`, clear: () => setCategoryFilter('all') } : null,
    favoritesOnly ? { label: 'Yêu thích', clear: () => setFavoritesOnly(false) } : null,
    sortNearby ? { label: 'Gần tôi', clear: clearNearby } : null,
    radius !== Infinity ? { label: `Trong ${radius / 1000} km`, clear: () => setRadius(Infinity) } : null,
  ].filter((item): item is { label: string; clear: () => void } => item !== null)

  const handleFavorite = async (bookId: string, currentlyFavorite: boolean) => {
    try {
      await toggleFavorite(bookId)
      showToast(currentlyFavorite ? 'Đã bỏ khỏi yêu thích' : 'Đã lưu vào yêu thích', 'success')
    } catch (cause) {
      console.error('Unable to update a saved-book preference', cause)
      showToast(userFacingError(cause, 'Chưa thể cập nhật sách yêu thích. Vui lòng thử lại.'), 'error')
    }
  }

  const clearFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const key of ['q', 'type', 'status', 'category', 'nearby', 'radius', 'favorite']) next.delete(key)
      return next
    }, { replace: true })
  }
  const browseCategory = (category: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const key of ['q', 'type', 'status', 'category', 'nearby', 'radius', 'favorite']) next.delete(key)
      next.set('category', category)
      return next
    }, { replace: true })
  }
  const closePreview = useCallback(() => setPreviewBook(null), [])
  const chooseRandomBook = () => {
    const availableBooks = filtered.filter((book) => book.status === 'available')
    if (availableBooks.length === 0) {
      showToast('Chưa có cuốn đang có sẵn khớp bộ lọc. Thử nới bộ lọc nhé.', 'info')
      return
    }
    setPreviewBook(availableBooks[Math.floor(Math.random() * availableBooks.length)])
  }
  const openBookDetails = (book: BookWithDistance) => {
    setPreviewBook(null)
    const route = user ? `/app/books/${book.id}` : `/books/${book.id}`
    navigate(`${route}${location.search}`, { state: { book } })
  }
  const activeFilterCount = [
    Boolean(search.trim()),
    filter !== 'all',
    statusFilter !== 'all',
    categoryFilter !== 'all',
    sortNearby,
    radius !== Infinity,
    favoritesOnly,
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {!publicMode && <p className="mb-2 text-xs font-medium text-text-muted">{timeGreeting(new Date().getHours())}{user?.fullName ? `, ${user.fullName}` : ''} 👋</p>}
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-yellow">{publicMode ? 'THƯ VIỆN BOOKI' : 'THƯ VIỆN CỘNG ĐỒNG'}</p>
          <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Kiếm sách gì nè?</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">Lướt sách đang được chia sẻ, xem tình trạng rồi kết nối với người đăng.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!loading && !error && books.length > 0 && (
            <button
              type="button"
              onClick={chooseRandomBook}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent-yellow/25 bg-accent-yellow/[0.07] px-4 py-2 text-sm font-semibold text-accent-yellow transition-colors hover:bg-accent-yellow/[0.13]"
            >
              <Dices className="h-4 w-4" aria-hidden="true" />
              Coi thử cuốn bất kỳ
            </button>
          )}
          <GradientButton onClick={() => navigate(user ? '/app/add-book' : '/register')}>{user ? '+ Share sách' : 'Vào Booki'}</GradientButton>
        </div>
      </div>

      <section aria-label="Tổng quan sách" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-text-muted">Sách đã tải</p>
          <p className="mt-1 text-2xl font-black text-text-primary">{books.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-text-muted">Có sẵn trong lượt này</p>
          <p className="mt-1 text-2xl font-black text-accent-yellow">{availableCount}</p>
        </div>
        <div className="glass-card col-span-2 rounded-2xl p-4 sm:col-span-1">
          <p className="text-xs text-text-muted">Kết quả đã tải phù hợp</p>
          <p className="mt-1 text-2xl font-black text-text-primary">{filtered.length}</p>
        </div>
      </section>

      {recentlyViewed.length > 0 && (
        <section aria-labelledby="recent-discovery-title" className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="recent-discovery-title" className="text-sm font-bold text-text-primary">Bạn vừa xem</h2>
            <span className="text-xs text-text-muted">Lịch sử chỉ lưu trên thiết bị</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentlyViewed.map((book) => (
              <Link
                key={book.id}
                to={`${user ? '/app' : ''}/books/${encodeURIComponent(book.id)}`}
                className="min-w-44 max-w-56 rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.65)] px-3 py-2.5 transition-colors hover:border-accent-yellow/25 hover:bg-[rgb(var(--color-interactive-hover)/.85)]"
              >
                <span className="block truncate text-sm font-semibold text-text-primary">{book.title}</span>
                <span className="mt-1 block truncate text-xs text-text-muted">{book.category}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!publicMode && !favoritesLoading && savedBooks.length > 0 && (
        <section aria-labelledby="saved-discovery-title" className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="saved-discovery-title" className="text-sm font-bold text-text-primary">Đang để ý</h2>
            <Link to="/app?favorite=1" className="text-xs font-semibold text-accent-yellow hover:underline">Xem sách đã lưu</Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedBooks.map((book) => (
              <Link
                key={book.id}
                to={`/app/books/${book.id}`}
                state={{ book }}
                className="min-w-44 max-w-56 rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.65)] px-3 py-2.5 transition-colors hover:border-accent-yellow/25 hover:bg-[rgb(var(--color-interactive-hover)/.85)]"
              >
                <span className="block truncate text-sm font-semibold text-text-primary">{book.title}</span>
                <span className="mt-1 block truncate text-xs text-text-muted">{book.ownerName}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="glass-card mb-4 grid gap-3 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:p-4" aria-label="Tìm và lọc sách">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            ref={searchInputRef}
            type="search"
            aria-label="Tìm theo tên sách, tác giả, thể loại hoặc mô tả"
            placeholder="Tên sách, tác giả, thể loại... (nhấn / để tìm)"
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
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="filter-chip rounded-full px-3.5 py-2 text-xs font-semibold text-accent-yellow sm:text-sm"
          >
            Xóa bộ lọc ({activeFilterCount})
          </button>
        )}
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
            onClick={() => setFavoritesOnly(!favoritesOnly)}
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
              onClick={() => setSortNearby(!sortNearby)}
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
      {activeFilters.length > 0 && (
        <div className="-mt-3 mb-5 flex flex-wrap gap-2" aria-label="Bộ lọc đang áp dụng">
          {activeFilters.map(({ label, clear }) => (
            <button
              key={label}
              type="button"
              onClick={clear}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent-yellow/20 bg-accent-yellow/[0.07] px-3 text-xs font-medium text-text-primary transition-colors hover:bg-accent-yellow/[0.13]"
              aria-label={`Bỏ bộ lọc ${label}`}
            >
              {label}<X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

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
        <div className="space-y-3">
          <EmptyState
            title={favoritesOnly ? 'Chưa có sách yêu thích phù hợp' : hasMore ? 'Chưa thấy cuốn hợp gu trong lượt này' : 'Chưa thấy cuốn nào hợp'}
            description={favoritesOnly
              ? 'Lưu một cuốn bạn thích, rồi quay lại đây xem bất cứ lúc nào.'
              : hasMore
                ? 'Tải thêm sách hoặc điều chỉnh từ khóa và bộ lọc để tìm tiếp.'
                : 'Thử đổi từ khóa hoặc bỏ bớt bộ lọc để mở rộng kết quả.'}
            actionLabel={hasMore ? loadingMore ? 'Đang tải...' : 'Tải thêm sách' : 'Xóa bộ lọc'}
            onAction={hasMore ? () => void loadMore() : clearFilters}
          />
          {!hasMore && suggestedCategories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Thể loại đang có sách">
              <span className="mr-1 text-xs text-text-muted">Thử xem:</span>
              {suggestedCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => browseCategory(category)}
                  className="filter-chip min-h-10 rounded-full px-3.5 text-xs font-semibold"
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-base font-bold text-text-primary" aria-live="polite">
            {favoritesOnly
              ? 'Sách bạn đã lưu'
              : debouncedSearch
                ? `Kết quả cho “${debouncedSearch}”`
                : recentlyViewed.length === 0
                  ? 'Mới được chia sẻ'
                  : 'Sách phù hợp với bạn'}
          </h2>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.16 }}
                >
                  <BookCard
                    book={book}
                    priority={index === 0}
                    compact
                    actionLabel="Xem chi tiết"
                    onAction={() => openBookDetails(book)}
                    onPreview={() => setPreviewBook(book)}
                    isFavorite={favoriteIds.has(book.id)}
                    onFavorite={user && !favoritesLoading ? () => void handleFavorite(book.id, favoriteIds.has(book.id)) : undefined}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
          {loadMoreError && (
            <p className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-rose/20 bg-accent-rose/[0.06] p-3 text-sm text-accent-rose" role="alert">
              <span>{loadMoreError}</span>
              <button type="button" className="font-semibold underline underline-offset-2" onClick={() => void loadMore()}>
                Thử tải lại
              </button>
            </p>
          )}
          {hasMore && (
            <div className="mt-7 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="filter-chip min-h-11 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore ? 'Đang tải thêm...' : 'Tải thêm sách'}
              </button>
            </div>
          )}
        </>
      )}
      <div className="sr-only" aria-live="polite">{filtered.length} kết quả sách</div>
      <Suspense fallback={null}>
        {previewBook && (
          <BookPreviewDialog
            book={previewBook}
            onClose={closePreview}
            onDetails={openBookDetails}
            isFavorite={favoriteIds.has(previewBook.id)}
            onFavorite={user && !favoritesLoading ? (bookId) => void handleFavorite(bookId, favoriteIds.has(bookId)) : undefined}
          />
        )}
      </Suspense>
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
