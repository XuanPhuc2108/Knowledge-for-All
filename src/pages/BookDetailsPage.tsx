import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Flag, Heart, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Star } from 'lucide-react'
import { Button } from '../components/Button'
import { BookCard } from '../components/BookCard'
import { BookShareSection } from '../components/BookShareSection'
import { EmptyState } from '../components/EmptyState'
import { ImageWithSkeleton } from '../components/ImageWithSkeleton'
import { useAuth } from '../hooks/useAuthState'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { getAdapter, getAdapterMode } from '../lib/dataAdapter'
import { CONDITION_LABELS, EXCHANGE_LABELS, STATUS_LABELS } from '../lib/constants'
import { formatDistance, haversineDistance } from '../lib/geo'
import { userFacingError } from '../lib/userFacingError'
import type { Book, BookReportReason, CommunityReview, MemberTrust } from '../types/book'

const REPORT_REASONS: { value: BookReportReason; label: string }[] = [
  { value: 'incorrect', label: 'Thông tin không chính xác' },
  { value: 'unavailable', label: 'Sách không còn khả dụng' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'other', label: 'Lý do khác' },
]

export function BookDetailsPage({ publicMode = false }: { publicMode?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const routeBook = (location.state as { book?: Book } | null)?.book
  const initialBook = routeBook && routeBook.id === id ? routeBook : null
  const { user } = useAuth()
  const { favoriteIds, loading: favoritesLoading, toggleFavorite } = useFavorites(user?.id)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(() => initialBook)
  const [loading, setLoading] = useState(() => !initialBook)
  const [error, setError] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<BookReportReason>('incorrect')
  const [reportDetails, setReportDetails] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([])
  const [memberTrust, setMemberTrust] = useState<MemberTrust | null>(null)
  const [memberReviews, setMemberReviews] = useState<CommunityReview[]>([])
  const [trustLoadFailed, setTrustLoadFailed] = useState(false)
  const displayedBook = book?.id === id ? book : initialBook
  const ownerId = displayedBook?.ownerId
  const recentBooks = useMemo(
    () => readRecentBooks(displayedBook?.id),
    [displayedBook?.id],
  )

  useEffect(() => {
    let cancelled = false
    if (!id) return
    void getAdapter().getBookById(id)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setError('Bài đăng này không tồn tại hoặc đã bị xóa.')
          setBook(null)
          return
        }
        setError(null)
        setBook(result)
      })
      .catch((cause: unknown) => {
        console.error('Unable to load book details', cause)
        if (!cancelled && !initialBook) setError('Chưa thể tải bài đăng này. Vui lòng thử lại sau.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, initialBook])

  useEffect(() => {
    if (!displayedBook) return
    let cancelled = false
    void getAdapter().getRelatedBooks(displayedBook.category, displayedBook.id, 4)
      .then((related) => {
        if (!cancelled) setRelatedBooks(related)
      })
      .catch((cause: unknown) => {
        console.warn('Unable to load related public book listings', cause)
      })
    try {
      const next = [
        { id: displayedBook.id, title: displayedBook.title, category: displayedBook.category },
        ...readRecentBooks().filter((entry) => entry.id !== displayedBook.id),
      ].slice(0, 6)
      localStorage.setItem('booki_recent_books', JSON.stringify(next))
    } catch (cause) {
      console.warn('Unable to save recently viewed public books', cause)
    }

    return () => { cancelled = true }
  }, [displayedBook])

  useEffect(() => {
    if (!ownerId) return
    let cancelled = false
    void Promise.all([
      getAdapter().getMemberTrust(ownerId),
      getAdapter().getMemberReviews(ownerId, 5),
    ]).then(([trust, reviews]) => {
      if (cancelled) return
      setMemberTrust(trust)
      setMemberReviews(reviews)
      setTrustLoadFailed(false)
    }).catch((cause: unknown) => {
      console.warn('Unable to load real community feedback for the book sharer', cause)
      if (!cancelled) setTrustLoadFailed(true)
    })
    return () => { cancelled = true }
  }, [ownerId])

  useEffect(() => {
    if (!displayedBook || !publicMode) return
    const previousTitle = document.title
    const description = displayedBook.description.trim().slice(0, 160)
    const canonicalUrl = new URL(`/books/${encodeURIComponent(displayedBook.id)}`, window.location.origin).toString()
    const tags = [
      { key: 'name', name: 'description', content: description },
      { key: 'name', name: 'robots', content: 'index, follow' },
      { key: 'property', name: 'og:title', content: `${displayedBook.title} | Booki` },
      { key: 'property', name: 'og:description', content: description },
      { key: 'property', name: 'og:type', content: 'book' },
      { key: 'property', name: 'og:url', content: canonicalUrl },
      ...(displayedBook.imageUrls[0] ? [{ key: 'property', name: 'og:image', content: displayedBook.imageUrls[0] }] : []),
    ]
    const previousTags = tags.map(({ key, name, content }) => {
      const selector = `meta[${key}="${name}"]`
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      const existed = Boolean(element)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(key, name)
        document.head.append(element)
      }
      const previous = element.getAttribute('content')
      element.setAttribute('content', content)
      return { element, existed, previous }
    })
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const canonicalExisted = Boolean(canonical)
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    const previousCanonical = canonical.href
    canonical.href = canonicalUrl
    document.title = `${displayedBook.title} | Booki`
    return () => {
      document.title = previousTitle
      if (!canonicalExisted) canonical.remove()
      else canonical.href = previousCanonical
      previousTags.forEach(({ element, existed, previous }) => {
        if (!existed) element.remove()
        else if (previous === null) element.removeAttribute('content')
        else element.setAttribute('content', previous)
      })
    }
  }, [displayedBook, publicMode])

  const submitReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !displayedBook) return
    setReportError(null)
    if (reportDetails.trim().length > 1000) {
      setReportError('Mô tả tối đa 1000 ký tự.')
      return
    }
    setReporting(true)
    try {
      await getAdapter().reportBook(user.id, displayedBook.id, reportReason, reportDetails)
      showToast('Đã gửi báo cáo để quản trị viên xem xét.', 'success')
      setReportOpen(false)
      setReportDetails('')
    } catch (cause) {
      console.error('Unable to report a public book listing', cause)
      setReportError(userFacingError(cause, 'Chưa thể gửi báo cáo. Vui lòng thử lại.'))
    } finally {
      setReporting(false)
    }
  }

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !displayedBook) return
    const message = requestMessage.trim()
    if (message.length < 10 || message.length > 1000) {
      setRequestError('Lời nhắn cần có từ 10 đến 1000 ký tự.')
      return
    }
    setRequestError(null)
    setRequesting(true)
    try {
      const request = await getAdapter().createExchangeRequest(user.id, {
        bookId: displayedBook.id,
        message,
      })
      showToast('Đã gửi lời đề nghị đến người đăng.', 'success')
      if (request.chatId) navigate(`/app/messages/${request.chatId}`)
      else navigate('/app/requests')
    } catch (cause) {
      console.error('Unable to create a book request', cause)
      setRequestError(userFacingError(cause, 'Chưa thể gửi lời đề nghị. Vui lòng thử lại.'))
    } finally {
      setRequesting(false)
    }
  }

  if (!id) return <EmptyState title="Không tìm thấy bài đăng" description="Mã bài đăng không hợp lệ." actionLabel="Quay lại" onAction={() => navigate(-1)} />
  if (!displayedBook && (loading || !error)) return <div className="py-20 text-center text-text-muted" role="status">Đang tải bài đăng...</div>
  if (!displayedBook) {
    return <EmptyState title="Không thể mở bài đăng" description={error ?? 'Không tìm thấy sách.'} actionLabel="Quay lại" onAction={() => navigate(-1)} />
  }

  const isOwner = user?.id === displayedBook.ownerId
  const favorite = favoriteIds.has(displayedBook.id)
  const handleCoverPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== 'mouse' ||
      document.documentElement.dataset.motion === 'reduced' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    event.currentTarget.style.setProperty('--cover-tilt-x', `${(0.5 - y) * 4}deg`)
    event.currentTarget.style.setProperty('--cover-tilt-y', `${(x - 0.5) * 4}deg`)
  }
  const resetCoverTilt = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--cover-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--cover-tilt-y', '0deg')
  }

  return (
    <div className="book-detail-page relative isolate mx-auto max-w-5xl space-y-5">
      {displayedBook.imageUrls[0] && (
        <div className="book-detail-ambient" aria-hidden="true">
          <img src={displayedBook.imageUrls[0]} alt="" width={800} height={1067} loading="lazy" decoding="async" />
        </div>
      )}
      <button type="button" onClick={() => navigate(-1)} className="filter-chip mb-1 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>
      <article className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
        <div
          className="book-cover-tilt glass-card relative overflow-hidden rounded-[1.5rem]"
          onPointerMove={handleCoverPointerMove}
          onPointerLeave={resetCoverTilt}
        >
          {displayedBook.imageUrls[0] ? (
            <ImageWithSkeleton
              src={displayedBook.imageUrls[0]}
              alt={`Bìa sách ${displayedBook.title}`}
              width={800}
              height={1067}
              loading="eager"
              fetchPriority="high"
              wrapperClassName="aspect-[3/4] w-full bg-[rgb(var(--color-interactive-surface)/.7)]"
              className="book-cover-tilt-target h-full w-full object-contain"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-[rgb(var(--color-interactive-surface)/.7)] text-text-muted">Chưa có ảnh bìa</div>
          )}
        </div>
        <div className="glass-card rounded-[1.5rem] p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-accent-yellow/20 px-3 py-1 text-xs font-semibold text-accent-yellow">{STATUS_LABELS[displayedBook.status]}</span>
            <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.9)] px-3 py-1 text-xs text-text-primary">{EXCHANGE_LABELS[displayedBook.exchangeType]}</span>
            <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.9)] px-3 py-1 text-xs text-text-primary">{displayedBook.category}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">{displayedBook.title}</h1>
          {displayedBook.author && <p className="mt-2 text-text-muted">{displayedBook.author}</p>}
          <p className="mt-3 text-sm text-text-muted">Tình trạng sách: {CONDITION_LABELS[displayedBook.condition]}</p>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{displayedBook.description}</p>
          <div className="mt-5 border-t border-glass/10 pt-4">
            <div className="flex items-center gap-3">
              {displayedBook.ownerAvatarUrl ? (
                <img src={displayedBook.ownerAvatarUrl} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-yellow/10 text-sm font-bold text-accent-yellow" aria-hidden="true">
                  {displayedBook.ownerName.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <p className="text-sm text-text-muted">Chia sẻ bởi <strong className="text-text-primary">{displayedBook.ownerName}</strong></p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-accent-teal"><ShieldCheck className="h-3.5 w-3.5" /> Thành viên cộng đồng</p>
              </div>
            </div>
            {displayedBook.ownerAreaLabel && <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><MapPin className="h-4 w-4" />{displayedBook.ownerAreaLabel}</p>}
            {user?.locationEnabled && user.latitude !== undefined && user.longitude !== undefined &&
              displayedBook.latitude !== undefined && displayedBook.longitude !== undefined && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
                <MapPin aria-hidden="true" className="h-4 w-4" />
                Cách bạn {formatDistance(haversineDistance(
                  user.latitude,
                  user.longitude,
                  displayedBook.latitude,
                  displayedBook.longitude,
                ))} từ bạn
              </p>
            )}
            <p className="mt-2 text-xs text-text-muted">
              Đăng ngày {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(displayedBook.createdAt))}
            </p>
          </div>
          <div className="mt-5 rounded-2xl border border-accent-yellow/20 bg-accent-yellow/[0.045] p-4">
            <h2 className="mb-3 text-sm font-bold text-text-primary">Cách liên hệ với người đăng</h2>
            {displayedBook.contactPhone && <a href={`tel:${displayedBook.contactPhone}`} className="mb-2 flex items-center gap-2 break-all text-sm text-text-primary hover:text-accent-yellow"><Phone className="h-4 w-4 shrink-0" />Gọi {displayedBook.contactPhone}</a>}
            {displayedBook.contactEmail && <a href={`mailto:${displayedBook.contactEmail}`} className="flex items-center gap-2 break-all text-sm text-text-primary hover:text-accent-yellow"><Mail className="h-4 w-4 shrink-0" />Email {displayedBook.contactEmail}</a>}
            {displayedBook.contactZaloUrl && <a href={displayedBook.contactZaloUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 break-all text-sm text-text-primary hover:text-accent-yellow"><MessageCircle className="h-4 w-4 shrink-0" />Nhắn qua Zalo</a>}
            {displayedBook.contactMessengerUrl && <a href={displayedBook.contactMessengerUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 break-all text-sm text-text-primary hover:text-accent-yellow"><MessageCircle className="h-4 w-4 shrink-0" />Nhắn qua Messenger</a>}
            {!displayedBook.contactPhone && !displayedBook.contactEmail && !displayedBook.contactZaloUrl && !displayedBook.contactMessengerUrl && (
              <div>
                <p className="text-sm leading-relaxed text-text-muted">
                  Người đăng chưa thêm cách liên hệ trên bài đăng này. Bạn có thể gửi lời đề nghị để trao đổi ngay trên Booki.
                </p>
                {isOwner && (
                  <Link to="/app/settings#personal" className="mt-3 inline-flex text-sm font-semibold text-accent-yellow hover:underline">
                    Cập nhật thông tin liên hệ
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {user && !isOwner && (
              <Button variant="outline" disabled={favoritesLoading} onClick={() => void toggleFavorite(displayedBook.id).then(
                () => showToast(favorite ? 'Đã bỏ khỏi yêu thích' : 'Đã lưu vào yêu thích', 'success'),
                (cause: unknown) => {
                  console.error('Unable to update a saved-book preference', cause)
                  showToast(userFacingError(cause, 'Chưa thể cập nhật sách yêu thích. Vui lòng thử lại.'), 'error')
                },
              )}>
                <Heart className={`h-4 w-4 ${favorite ? 'fill-accent-rose text-accent-rose' : ''}`} />
                {favorite ? 'Đã yêu thích' : 'Yêu thích'}
              </Button>
            )}
            {!user && <Link to="/login" className="text-sm font-medium text-accent-yellow">Đăng nhập để lưu sách</Link>}
            {isOwner && <Button variant="outline" onClick={() => navigate(`/app/my-books/${displayedBook.id}/edit`)}>Chỉnh sửa bài đăng</Button>}
            {user && !isOwner && displayedBook.status === 'available' && (
              <Button onClick={() => { setRequestError(null); setRequestOpen(true) }}>
                <MessageCircle aria-hidden="true" className="h-4 w-4" /> Gửi lời đề nghị
              </Button>
            )}
            {!user && displayedBook.status === 'available' && (
              <Link to="/login" className="inline-flex min-h-10 items-center rounded-xl bg-accent-yellow px-4 py-2 text-sm font-semibold text-dark">
                Đăng nhập để gửi lời đề nghị
              </Link>
            )}
            {user && !isOwner && (
              <Button variant="ghost" onClick={() => { setReportError(null); setReportOpen(true) }}>
                <Flag className="h-4 w-4" /> Báo cáo
              </Button>
            )}
          </div>
        </div>
      </article>

      <BookShareSection bookId={displayedBook.id} title={displayedBook.title} ownerName={displayedBook.ownerName} />

      <section aria-labelledby="community-trust-title" className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-yellow">PHẢN HỒI CỘNG ĐỒNG</p>
            <h2 id="community-trust-title" className="mt-1 text-xl font-bold text-text-primary">Trải nghiệm với {displayedBook.ownerName}</h2>
          </div>
          {memberTrust && memberTrust.reviewCount > 0 && memberTrust.averageRating !== undefined && (
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-yellow" aria-label={`${memberTrust.averageRating} trên 5, ${memberTrust.reviewCount} đánh giá`}>
              <Star aria-hidden="true" className="h-4 w-4 fill-current" />
              {memberTrust.averageRating} · {memberTrust.reviewCount} đánh giá
            </p>
          )}
        </div>
        {trustLoadFailed ? (
          <p className="mt-4 text-sm text-text-muted">Chưa tải được phản hồi lúc này.</p>
        ) : (
          <>
            {memberTrust && memberTrust.completedInteractions > 0 && (
              <p className="mt-3 text-sm text-text-muted">
                Đã hoàn tất {memberTrust.completedInteractions} lượt kết nối qua Booki.
              </p>
            )}
            {memberReviews.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {memberReviews.map((review) => <ReviewCard key={review.id} review={review} />)}
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-muted">
                {memberTrust?.completedInteractions
                  ? 'Chưa có phản hồi sau các lượt kết nối đã hoàn tất.'
                  : 'Chưa ghi nhận tương tác hoàn tất hoặc đánh giá nào.'}
              </p>
            )}
          </>
        )}
      </section>

      {relatedBooks.length > 0 && (
        <section aria-labelledby="related-books-title" className="pt-3">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-yellow">Cùng thể loại</p>
            <h2 id="related-books-title" className="mt-1 text-xl font-bold text-text-primary">Bạn có thể quan tâm</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedBooks.map((related) => (
              <BookCard
                key={related.id}
                book={related}
                actionLabel="Xem sách"
                onAction={() => navigate(`/books/${related.id}`, { state: { book: related } })}
              />
            ))}
          </div>
        </section>
      )}

      {recentBooks.length > 0 && (
        <section aria-labelledby="recent-books-title" className="glass-card rounded-2xl p-5">
          <h2 id="recent-books-title" className="text-lg font-bold text-text-primary">Bạn vừa xem</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {recentBooks.map((recent) => (
              <li key={recent.id}>
                <Link to={`/books/${recent.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.6)] px-4 py-3 transition-colors hover:border-accent-yellow/25 hover:bg-[rgb(var(--color-interactive-hover)/.8)]">
                  <span className="truncate text-sm font-medium text-text-primary">{recent.title}</span>
                  <span className="shrink-0 text-xs text-text-muted">{recent.category}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/85 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="report-title" className="glass-card w-full max-w-lg rounded-card p-5 sm:p-6">
            <h2 id="report-title" className="text-lg font-bold text-text-primary">Báo cáo bài đăng</h2>
            <p className="mt-1 text-sm text-text-muted">
              {getAdapterMode() === 'supabase'
                ? 'Báo cáo sẽ được gửi để quản trị viên xem xét.'
                : 'Đang dùng chế độ trên thiết bị: báo cáo chỉ được lưu cục bộ, chưa gửi tới quản trị viên.'}
            </p>
            <form onSubmit={(event) => void submitReport(event)} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Lý do
                <select value={reportReason} onChange={(event) => setReportReason(event.target.value as BookReportReason)} className="mt-1.5 w-full rounded-lg border border-glass bg-dark px-3 py-2.5 text-text-primary">
                  {REPORT_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Mô tả thêm (không bắt buộc)
                <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={3} className="field-control mt-1.5 px-3 py-2.5 text-sm" />
              </label>
              {reportError && <p className="text-sm text-accent-rose" role="alert">{reportError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={reporting} onClick={() => setReportOpen(false)}>Hủy</Button>
                <Button type="submit" variant="danger" disabled={reporting}>{reporting ? 'Đang gửi...' : 'Gửi báo cáo'}</Button>
              </div>
            </form>
          </section>
        </div>
      )}
      {requestOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/85 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !requesting) setRequestOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="request-title" className="glass-card w-full max-w-lg rounded-card p-5 sm:p-6">
            <h2 id="request-title" className="text-lg font-bold text-text-primary">Gửi lời đề nghị</h2>
            <p className="mt-1 text-sm text-text-muted">Giới thiệu ngắn gọn bạn muốn kết nối ra sao về “{displayedBook.title}”.</p>
            <form onSubmit={(event) => void submitRequest(event)} className="mt-4 space-y-4">
              <label htmlFor="request-message" className="block text-sm font-medium text-text-primary">
                Lời nhắn
                <textarea
                  id="request-message"
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  minLength={10}
                  maxLength={1000}
                  rows={4}
                  required
                  className="field-control mt-1.5 px-3 py-2.5 text-sm"
                  placeholder="Chào bạn, mình muốn hỏi thêm về cuốn sách..."
                />
              </label>
              <p className="text-right text-xs text-text-muted">{requestMessage.length}/1000</p>
              {requestError && <p className="text-sm text-accent-rose" role="alert">{requestError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={requesting} onClick={() => setRequestOpen(false)}>Để sau</Button>
                <Button type="submit" disabled={requesting}>{requesting ? 'Đang gửi...' : 'Gửi đề nghị'}</Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review }: { review: CommunityReview }) {
  return (
    <article className="rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.6)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{review.reviewerName}</p>
        <p className="inline-flex items-center gap-1 text-sm font-bold text-accent-yellow">
          <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" /> {review.rating}/5
        </p>
      </div>
      {review.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{review.comment}</p>}
      <p className="mt-3 text-[11px] text-text-muted">
        Giao tiếp {review.communicationRating}/5 · Tin cậy {review.reliabilityRating}/5 · Đúng mô tả {review.descriptionRating}/5
      </p>
    </article>
  )
}

function readRecentBooks(excludeId?: string): { id: string; title: string; category: string }[] {
  try {
    const stored = localStorage.getItem('booki_recent_books')
    const parsed = stored ? JSON.parse(stored) as unknown : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is { id: string; title: string; category: string } =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      typeof entry.title === 'string' &&
      typeof entry.category === 'string' &&
      entry.id !== excludeId)
  } catch (cause) {
    console.warn('Unable to read recently viewed public books', cause)
    return []
  }
}
