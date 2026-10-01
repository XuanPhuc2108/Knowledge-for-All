import { Link, useNavigate } from 'react-router-dom'
import { BookCard } from '../components/BookCard'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../hooks/useAuthState'
import type { Book } from '../types/book'

interface BookCarousel3DSectionProps {
  books: Book[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function BookCarousel3DSection({ books, loading, error, refetch }: BookCarousel3DSectionProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <section id="community-books" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24 lg:px-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-yellow">MỚI LÊN KỆ NÈ</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Có gì hay để đọc nè</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
            Lướt mấy cuốn đang có nè, ưng cuốn nào thì bấm vô coi chi tiết nghen.
          </p>
        </div>
        <Link to="/explore" className="inline-flex min-h-10 items-center rounded-xl border border-accent-yellow/25 bg-accent-yellow/[0.07] px-4 py-2 text-sm font-semibold text-accent-yellow transition-colors hover:bg-accent-yellow/[0.13]">
          Xem hết sách
        </Link>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 lg:gap-5" role="status" aria-label="Đang tải sách">
          {[0, 1, 2].map((item) => <div key={item} className="aspect-[3/5] animate-pulse rounded-card bg-[rgb(var(--color-interactive-surface)/.7)]" />)}
        </div>
      ) : error ? (
        <EmptyState title="Chưa thể tải sách" description="Danh sách chưa khả dụng. Thử tải lại sau ít phút." actionLabel="Thử lại" onAction={() => void refetch()} />
      ) : books.length === 0 ? (
        <EmptyState
          title="Thư viện đang chờ cuốn sách đầu tiên"
          description="Chưa có bài đăng công khai. Bạn có thể quay lại sau hoặc chia sẻ cuốn sách đầu tiên."
          actionLabel={user ? 'Đăng sách' : 'Tạo tài khoản'}
          onAction={() => navigate(user ? '/app/add-book' : '/register')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              compact
              actionLabel="Xem chi tiết"
              onAction={() => navigate(user ? `/app/books/${book.id}` : `/books/${book.id}`, { state: { book } })}
            />
          ))}
        </div>
      )}
    </section>
  )
}
