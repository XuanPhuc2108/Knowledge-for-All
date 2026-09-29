import { AnimatePresence, motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BookCard } from '../components/BookCard'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuthState'
import { useMyBooks } from '../hooks/useBooks'
import { STATUS_LABELS } from '../lib/constants'
import type { Book, BookStatus } from '../types/book'

export function MyBooksPage() {
  const { user } = useAuth()
  const { books, loading, error, updateBook, deleteBook } = useMyBooks(user?.id)
  const { showToast } = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleStatusChange = async (book: Book, status: BookStatus) => {
    try {
      await updateBook(book.id, { status })
      showToast(`Đã cập nhật trạng thái: ${STATUS_LABELS[status]}`, 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Cập nhật thất bại', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteBook(deleteId)
      showToast('Đã xóa sách', 'success')
      setDeleteId(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Xóa thất bại', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Không thể tải sách của bạn"
        description={error}
      />
    )
  }

  if (books.length === 0) {
    return (
      <EmptyState
        title="Bạn chưa đăng sách nào"
        description="Hãy chia sẻ quyển sách đầu tiên của bạn."
        actionLabel="Đăng sách ngay"
        onAction={() => window.location.assign('/app/add-book')}
      />
    )
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-black text-text-primary">Sách của tôi</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <div key={book.id} className="space-y-3">
            <BookCard book={book} />
            <div className="flex flex-wrap gap-2">
              {(['available', 'reserved', 'shared'] as BookStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => void handleStatusChange(book, status)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    book.status === status
                      ? 'bg-accent-yellow text-dark'
                      : 'bg-white/10 text-text-muted hover:bg-white/15'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
              <button
                onClick={() => setDeleteId(book.id)}
                className="ml-auto rounded-full bg-accent-rose/20 p-2 text-accent-rose hover:bg-accent-rose/30"
                aria-label="Xóa sách"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-dark/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card max-w-sm rounded-card-lg p-6"
            >
              <h2 id="delete-title" className="mb-4 text-lg font-bold">Xác nhận xóa sách?</h2>
              <p className="mb-6 text-sm text-text-muted">Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
                  Hủy
                </Button>
                <Button className="flex-1 bg-accent-rose hover:bg-accent-rose/90" onClick={() => void handleDelete()}>
                  Xóa
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
