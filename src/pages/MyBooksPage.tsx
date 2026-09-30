import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookCard } from '../components/BookCard'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../hooks/useAuthState'
import { useMyBooks } from '../hooks/useBooks'
import { useToast } from '../hooks/useToast'
import { STATUS_LABELS } from '../lib/constants'
import type { BookStatus } from '../types/book'

type BookTab = 'all' | BookStatus

const TABS: { value: BookTab; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'available', label: 'Có sẵn' },
  { value: 'loaned', label: 'Đang cho mượn' },
  { value: 'exchanged', label: 'Đã trao đổi' },
]

export function MyBooksPage() {
  const { user } = useAuth()
  const { books, loading, error, refetch, updateBook, deleteBook } = useMyBooks(user?.id)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<BookTab>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filteredBooks = useMemo(
    () => activeTab === 'all' ? books : books.filter((book) => book.status === activeTab),
    [activeTab, books],
  )
  const counts = useMemo(() => ({
    all: books.length,
    available: books.filter((book) => book.status === 'available').length,
    loaned: books.filter((book) => book.status === 'loaned').length,
    exchanged: books.filter((book) => book.status === 'exchanged').length,
  }), [books])

  const handleStatusChange = async (bookId: string, status: BookStatus) => {
    setUpdatingId(bookId)
    try {
      await updateBook(bookId, { status })
      showToast(`Đã cập nhật trạng thái: ${STATUS_LABELS[status]}`, 'success')
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Cập nhật thất bại', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteBook(deleteId)
      showToast('Đã xóa sách', 'success')
      setDeleteId(null)
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Xóa thất bại', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" /></div>
  }
  if (error) {
    return <EmptyState title="Không thể tải sách của bạn" description={error} actionLabel="Thử lại" onAction={() => void refetch()} />
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-yellow">KHÔNG GIAN CỦA BẠN</p>
          <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Sách của tôi</h1>
          <p className="mt-2 text-sm text-text-muted">Quản lý bài đăng, tình trạng và thông tin sách.</p>
        </div>
        <Button onClick={() => navigate('/app/add-book')}>Đăng sách</Button>
      </header>

      <section aria-label="Tổng số sách" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              activeTab === tab.value
                ? 'border-accent-yellow/45 bg-accent-yellow/[0.1] shadow-[0_8px_24px_rgb(251_191_36_/_0.07)]'
                : 'border-glass/10 bg-[rgb(var(--color-interactive-surface)/.78)] hover:border-glass/20 hover:bg-[rgb(var(--color-interactive-hover)/.88)]'
            }`}
          >
            <span className="block text-xs text-text-muted">{tab.label}</span>
            <span className="mt-1 block text-2xl font-black text-text-primary">{counts[tab.value]}</span>
          </button>
        ))}
      </section>

      <nav aria-label="Lọc sách theo trạng thái" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`filter-chip shrink-0 rounded-full px-4 py-2 text-sm ${activeTab === tab.value ? 'border-accent-yellow/40 bg-accent-yellow/10 text-accent-yellow' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {books.length === 0 ? (
        <EmptyState
          title="Bạn chưa đăng sách nào"
          description="Hãy chia sẻ quyển sách đầu tiên của bạn."
          actionLabel="Đăng sách ngay"
          onAction={() => navigate('/app/add-book')}
        />
      ) : filteredBooks.length === 0 ? (
        <EmptyState title="Không có sách ở trạng thái này" description="Chọn trạng thái khác hoặc đổi tình trạng một bài đăng." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map((book) => (
            <article key={book.id} className="space-y-3">
              <BookCard
                book={book}
                compact
                actionLabel="Xem bài đăng"
                onAction={() => navigate(`/app/books/${book.id}`, { state: { book } })}
              />
              <div className="settings-panel !p-3">
                <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor={`status-${book.id}`}>Tình trạng bài đăng</label>
                <select
                  id={`status-${book.id}`}
                  value={book.status}
                  disabled={updatingId === book.id}
                  onChange={(event) => void handleStatusChange(book.id, event.target.value as BookStatus)}
                  className="w-full rounded-lg border border-glass bg-dark px-3 py-2 text-sm text-text-primary"
                >
                  {(['available', 'loaned', 'exchanged'] as const).map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-text-muted">
                  Đăng ngày {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(book.createdAt))}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/app/my-books/${book.id}/edit`)}>
                    Chỉnh sửa
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteId(book.id)}>
                    Xóa
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/85 p-4" role="presentation">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-book-title" className="glass-card w-full max-w-sm rounded-card p-6">
            <h2 id="delete-book-title" className="text-lg font-bold text-text-primary">Xác nhận xóa sách?</h2>
            <p className="mt-2 text-sm text-text-muted">Bài đăng sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" disabled={deleting} onClick={() => setDeleteId(null)}>Hủy</Button>
              <Button variant="danger" disabled={deleting} onClick={() => void handleDelete()}>
                {deleting ? 'Đang xóa...' : 'Xóa sách'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
