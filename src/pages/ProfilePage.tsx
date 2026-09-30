import { Link, useNavigate } from 'react-router-dom'
import { BookCard } from '../components/BookCard'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/Button'
import { ImageWithSkeleton } from '../components/ImageWithSkeleton'
import { useAuth } from '../hooks/useAuthState'
import { useMyBooks } from '../hooks/useBooks'
import { getAdapterMode } from '../lib/dataAdapter'

export function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { books, loading, error } = useMyBooks(user?.id)

  if (!user) return null

  const loanedCount = books.filter((book) => book.status === 'loaned').length
  const exchangedCount = books.filter((book) => book.status === 'exchanged').length

  return (
    <div className="space-y-8">
      <section className="glass-card relative flex flex-col gap-6 overflow-hidden rounded-[1.75rem] p-5 sm:flex-row sm:items-center sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-accent-yellow/[0.07] blur-3xl" aria-hidden="true" />
        {user.avatarUrl ? (
          <ImageWithSkeleton
            src={user.avatarUrl}
            alt=""
            width={96}
            height={96}
            loading="eager"
            wrapperClassName="relative h-24 w-24 shrink-0 rounded-[1.65rem]"
            className="h-full w-full rounded-[1.65rem] border border-glass/10 object-cover shadow-lg"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.65rem] border border-accent-yellow/20 bg-accent-yellow/10 text-3xl font-bold text-accent-yellow shadow-inner">
            {user.fullName.trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="relative min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">{user.fullName}</h1>
            <span className="rounded-full border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.8)] px-3 py-1 text-xs text-text-muted">
              {getAdapterMode() === 'supabase' ? 'Tài khoản trực tuyến' : 'Lưu trên thiết bị'}
            </span>
          </div>
          <p className="mt-1 break-all text-sm text-text-muted">{user.email}</p>
          {user.areaLabel && user.showArea && (
            <p className="mt-2 text-sm text-text-muted">{user.areaLabel}</p>
          )}
          {user.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-primary">{user.bio}</p>}
        </div>
        <Link to="/app/settings#personal">
          <Button variant="outline">Chỉnh sửa hồ sơ</Button>
        </Link>
      </section>

      <section aria-label="Thống kê sách" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ProfileStat label="Đã đăng" value={books.length} />
        <ProfileStat label="Đang cho mượn" value={loanedCount} />
        <ProfileStat label="Đã trao đổi" value={exchangedCount} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <h2 className="mb-4 font-bold text-text-primary">Liên hệ & quyền riêng tư</h2>
          <dl className="space-y-3 text-sm">
            <ProfileDetail label="Điện thoại" value={user.contactPhone} visible={user.showContactPhone} />
            <ProfileDetail label="Email liên hệ" value={user.contactEmail} visible={user.showContactEmail} />
            <ProfileDetail label="Khu vực" value={user.areaLabel} visible={user.showArea} />
            <ProfileDetail label="Định vị" value={user.locationEnabled ? 'Đang bật' : 'Đang tắt'} />
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            Vị trí chính xác không hiển thị trên hồ sơ. Bạn có thể bật/tắt từng thông tin công khai trong cài đặt.
          </p>
          <Link to="/app/settings#privacy" className="mt-4 inline-flex text-sm font-semibold text-accent-yellow hover:underline">
            Cài đặt quyền riêng tư
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <h2 className="mb-3 font-bold text-text-primary">Trạng thái tài khoản</h2>
          <p className="text-sm text-text-muted">
            Đăng nhập bằng email. Email tài khoản do nhà cung cấp xác thực quản lý.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-accent-teal/10 px-3 py-1.5 text-accent-teal">
              {user.locationEnabled ? 'Đã cho phép định vị' : 'Chưa chia sẻ vị trí'}
            </span>
            <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.9)] px-3 py-1.5 text-text-muted">
              {user.showContactPhone || user.showContactEmail || user.showArea
                ? 'Có thông tin hồ sơ công khai'
                : 'Hồ sơ riêng tư'}
            </span>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Sách của tôi</h2>
            <p className="mt-1 text-sm text-text-muted">Các bài đăng thuộc tài khoản này</p>
          </div>
          <Link to="/app/my-books" className="text-sm font-semibold text-accent-yellow hover:underline">
            Quản lý sách
          </Link>
        </div>
        {loading ? (
          <LoadingCards />
        ) : error ? (
          <EmptyState title="Không thể tải sách của bạn" description={error} />
        ) : books.length === 0 ? (
          <EmptyState
            title="Chưa có bài đăng"
            description="Khi đăng sách, các bài đăng của bạn sẽ xuất hiện tại đây."
            actionLabel="Đăng sách"
            onAction={() => navigate('/app/add-book')}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {books.slice(0, 3).map((book) => (
              <BookCard
                key={book.id}
                book={book}
                actionLabel="Xem sách"
                onAction={() => navigate(`/app/books/${book.id}`, { state: { book } })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-5">
      <span className="absolute right-4 top-4 h-8 w-8 rounded-xl bg-accent-yellow/[0.08]" aria-hidden="true" />
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-text-primary">{value}</p>
    </div>
  )
}

function ProfileDetail({ label, value, visible }: { label: string; value?: string; visible?: boolean }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-glass/10 pb-2 last:border-0">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right text-text-primary">
        {value || 'Chưa cập nhật'}
        {visible !== undefined && (
          <span className="ml-2 text-xs text-text-muted">{visible ? '· Công khai' : '· Riêng tư'}</span>
        )}
      </dd>
    </div>
  )
}

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải sách">
      {[0, 1, 2].map((key) => <div key={key} className="glass-card aspect-[3/4] animate-pulse rounded-card" />)}
    </div>
  )
}
