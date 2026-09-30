import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Flag, Heart, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
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
import type { Book, BookReportReason } from '../types/book'

const REPORT_REASONS: { value: BookReportReason; label: string }[] = [
  { value: 'incorrect', label: 'Thông tin không chính xác' },
  { value: 'unavailable', label: 'Sách không còn khả dụng' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'other', label: 'Lý do khác' },
]

export function BookDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { favoriteIds, loading: favoritesLoading, toggleFavorite } = useFavorites(user?.id)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<BookReportReason>('incorrect')
  const [reportDetails, setReportDetails] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([])
  const [recentBooks, setRecentBooks] = useState<{ id: string; title: string; category: string }[]>([])

  useEffect(() => {
    let cancelled = false
    if (!id) return
    void getAdapter().getBookById(id)
      .then((result) => {
        if (cancelled) return
        if (!result) setError('Bài đăng này không tồn tại hoặc đã bị xóa.')
        setBook(result)
      })
      .catch((cause: unknown) => {
        console.error('Unable to load book details', cause)
        if (!cancelled) setError('Chưa thể tải bài đăng này. Vui lòng thử lại sau.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!book) return
    let cancelled = false
    void getAdapter().getRelatedBooks(book.category, book.id, 4)
      .then((related) => {
        if (!cancelled) setRelatedBooks(related)
      })
      .catch((cause: unknown) => {
        console.warn('Unable to load related public book listings', cause)
      })
    try {
      const stored = localStorage.getItem('booki_recent_books')
      const parsed = stored ? JSON.parse(stored) as unknown : []
      const valid = Array.isArray(parsed)
        ? parsed.filter((entry): entry is { id: string; title: string; category: string } =>
          Boolean(entry) &&
          typeof entry === 'object' &&
          typeof entry.id === 'string' &&
          typeof entry.title === 'string' &&
          typeof entry.category === 'string')
        : []
      const next = [
        { id: book.id, title: book.title, category: book.category },
        ...valid.filter((entry) => entry.id !== book.id),
      ].slice(0, 6)
      localStorage.setItem('booki_recent_books', JSON.stringify(next))
      setRecentBooks(next.filter((entry) => entry.id !== book.id))
    } catch (cause) {
      console.warn('Unable to save recently viewed public books', cause)
    }
    return () => { cancelled = true }
  }, [book])

  const submitReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !book) return
    setReportError(null)
    if (reportDetails.trim().length > 1000) {
      setReportError('Mô tả tối đa 1000 ký tự.')
      return
    }
    setReporting(true)
    try {
      await getAdapter().reportBook(user.id, book.id, reportReason, reportDetails)
      showToast('Đã gửi báo cáo để quản trị viên xem xét.', 'success')
      setReportOpen(false)
      setReportDetails('')
    } catch (cause) {
      setReportError(cause instanceof Error ? cause.message : 'Không thể gửi báo cáo.')
    } finally {
      setReporting(false)
    }
  }

  if (!id) return <EmptyState title="Không tìm thấy bài đăng" description="Mã bài đăng không hợp lệ." actionLabel="Quay lại" onAction={() => navigate(-1)} />
  if (loading) return <div className="py-20 text-center text-text-muted" role="status">Đang tải bài đăng...</div>
  if (error || !book) {
    return <EmptyState title="Không thể mở bài đăng" description={error ?? 'Không tìm thấy sách.'} actionLabel="Quay lại" onAction={() => navigate(-1)} />
  }

  const isOwner = user?.id === book.ownerId
  const favorite = favoriteIds.has(book.id)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <button type="button" onClick={() => navigate(-1)} className="filter-chip mb-1 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>
      <article className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
        <div className="glass-card overflow-hidden rounded-[1.5rem]">
          {book.imageUrls[0] ? (
            <ImageWithSkeleton
              src={book.imageUrls[0]}
              alt={`Bìa sách ${book.title}`}
              width={800}
              height={1067}
              loading="eager"
              fetchPriority="high"
              wrapperClassName="aspect-[3/4] w-full bg-[rgb(var(--color-interactive-surface)/.7)]"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-[rgb(var(--color-interactive-surface)/.7)] text-text-muted">Chưa có ảnh bìa</div>
          )}
        </div>
        <div className="glass-card rounded-[1.5rem] p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-accent-yellow/20 px-3 py-1 text-xs font-semibold text-accent-yellow">{STATUS_LABELS[book.status]}</span>
            <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.9)] px-3 py-1 text-xs text-text-primary">{EXCHANGE_LABELS[book.exchangeType]}</span>
            <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.9)] px-3 py-1 text-xs text-text-primary">{book.category}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">{book.title}</h1>
          {book.author && <p className="mt-2 text-text-muted">{book.author}</p>}
          <p className="mt-3 text-sm text-text-muted">Tình trạng sách: {CONDITION_LABELS[book.condition]}</p>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{book.description}</p>
          <div className="mt-5 border-t border-glass/10 pt-4">
            <div className="flex items-center gap-3">
              {book.ownerAvatarUrl ? (
                <img src={book.ownerAvatarUrl} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-yellow/10 text-sm font-bold text-accent-yellow" aria-hidden="true">
                  {book.ownerName.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <p className="text-sm text-text-muted">Chia sẻ bởi <strong className="text-text-primary">{book.ownerName}</strong></p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-accent-teal"><ShieldCheck className="h-3.5 w-3.5" /> Thành viên cộng đồng</p>
              </div>
            </div>
            {book.ownerAreaLabel && <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><MapPin className="h-4 w-4" />{book.ownerAreaLabel}</p>}
            <p className="mt-2 text-xs text-text-muted">
              Đăng ngày {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(book.createdAt))}
            </p>
          </div>
          {(book.contactPhone || book.contactEmail) && (
            <div className="mt-5 rounded-2xl border border-accent-yellow/20 bg-accent-yellow/[0.045] p-4">
              <h2 className="mb-3 text-sm font-bold text-text-primary">Thông tin liên hệ do người đăng chia sẻ</h2>
              {book.contactPhone && <a href={`tel:${book.contactPhone}`} className="mb-2 flex items-center gap-2 break-all text-sm text-text-primary hover:text-accent-yellow"><Phone className="h-4 w-4 shrink-0" />{book.contactPhone}</a>}
              {book.contactEmail && <a href={`mailto:${book.contactEmail}`} className="flex items-center gap-2 break-all text-sm text-text-primary hover:text-accent-yellow"><Mail className="h-4 w-4 shrink-0" />{book.contactEmail}</a>}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {user && !isOwner && (
              <Button variant="outline" disabled={favoritesLoading} onClick={() => void toggleFavorite(book.id).then(
                () => showToast(favorite ? 'Đã bỏ khỏi yêu thích' : 'Đã lưu vào yêu thích', 'success'),
                (cause: unknown) => showToast(cause instanceof Error ? cause.message : 'Không thể cập nhật yêu thích', 'error'),
              )}>
                <Heart className={`h-4 w-4 ${favorite ? 'fill-accent-rose text-accent-rose' : ''}`} />
                {favorite ? 'Đã yêu thích' : 'Yêu thích'}
              </Button>
            )}
            {!user && <Link to="/login" className="text-sm font-medium text-accent-yellow">Đăng nhập để lưu sách</Link>}
            {isOwner && <Button variant="outline" onClick={() => navigate(`/app/my-books/${book.id}/edit`)}>Chỉnh sửa bài đăng</Button>}
            {user && !isOwner && (
              <Button variant="ghost" onClick={() => { setReportError(null); setReportOpen(true) }}>
                <Flag className="h-4 w-4" /> Báo cáo
              </Button>
            )}
          </div>
        </div>
      </article>

      <BookShareSection bookId={book.id} title={book.title} ownerName={book.ownerName} />

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
                onAction={() => navigate(`/books/${related.id}`)}
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
    </div>
  )
}
