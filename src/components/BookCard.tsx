import clsx from 'clsx'
import { Eye, Heart, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { CONDITION_LABELS, EXCHANGE_LABELS, STATUS_LABELS } from '../lib/constants'
import { formatDistance } from '../lib/geo'
import { ILLUSTRATIONS } from '../lib/images'
import type { BookWithDistance } from '../types/book'
import { Button } from './Button'
import { ImageWithSkeleton } from './ImageWithSkeleton'

interface BookCardProps {
  book: BookWithDistance
  onAction?: () => void
  actionLabel?: string
  compact?: boolean
  isFavorite?: boolean
  onFavorite?: () => void
  onPreview?: () => void
}

export function BookCard({
  book,
  onAction,
  actionLabel = 'Xem chi tiết',
  compact,
  isFavorite = false,
  onFavorite,
  onPreview,
}: BookCardProps) {
  return (
    <article
      className={clsx(
        'glass-card group overflow-hidden rounded-card transition-[border-color,box-shadow,transform] duration-200 ease-out lg:rounded-card-lg',
        'hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-[0_24px_58px_rgb(0_0_0_/_0.2)]',
        'w-full',
      )}
    >
      <div className={clsx(
        'relative overflow-hidden bg-[rgb(var(--color-interactive-surface)/.8)]',
        compact ? 'aspect-[4/3]' : 'aspect-[3/4]',
      )}>
        <BookCardCover
          key={`${book.id}:${book.imageUrls[0] ?? ''}`}
          bookId={book.id}
          imageUrls={book.imageUrls}
          title={book.title}
          compact={compact}
        />
        <span className="absolute left-3 top-3 rounded-full border border-accent-yellow/20 bg-dark/80 px-3 py-1 text-xs font-semibold text-accent-yellow backdrop-blur-md">
          {EXCHANGE_LABELS[book.exchangeType]}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-dark/70 px-2 py-1 text-xs text-text-primary backdrop-blur-sm">
          {STATUS_LABELS[book.status]}
        </span>
        {onPreview && (
          <button
            type="button"
            aria-label={`Xem nhanh ${book.title}`}
            onClick={(event) => { event.stopPropagation(); onPreview() }}
            className="absolute bottom-3 left-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-dark/80 px-3 text-xs font-semibold text-text-primary shadow-lg backdrop-blur-sm transition-colors hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Xem nhanh
          </button>
        )}
        {onFavorite && (
          <button
            type="button"
            aria-label={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
            aria-pressed={isFavorite}
            onClick={(event) => { event.stopPropagation(); onFavorite() }}
            className="absolute bottom-3 right-3 rounded-full bg-dark/75 p-2 text-text-primary backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 hover:text-accent-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'animate-book-favorite-pop fill-accent-rose text-accent-rose' : ''}`} />
          </button>
        )}
      </div>

      <div className={compact ? 'p-3' : 'p-4'}>
        <h3 className={clsx('mb-1 line-clamp-2 font-bold text-text-primary', compact && 'text-sm')}>{book.title}</h3>
        {book.author && (
          <p className="mb-2 text-sm text-text-muted">{book.author}</p>
        )}
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.9)] px-2.5 py-1 text-text-muted">{book.category}</span>
          <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.9)] px-2.5 py-1 text-text-muted">
            {CONDITION_LABELS[book.condition]}
          </span>
        </div>
        <p className="mb-3 text-xs text-text-muted">
          Người đăng: <span className="font-medium text-text-primary">{book.ownerName}</span>
        </p>
        {book.distanceMeters !== undefined && (
          <p className="mb-3 flex items-center gap-1 text-xs text-accent-teal">
            <MapPin className="h-3 w-3" />
            {formatDistance(book.distanceMeters)}
          </p>
        )}
        {!compact && (book.contactPhone || book.contactEmail || book.contactZaloUrl || book.contactMessengerUrl) && (
          <div className="mb-3 space-y-1 rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.65)] px-3 py-2 text-xs text-text-muted">
            <p className="font-medium text-text-primary">Liên hệ người đăng</p>
            {book.contactPhone && (
              <a href={`tel:${book.contactPhone}`} className="flex items-center gap-1.5 hover:text-accent-yellow">
                <Phone className="h-3 w-3" />
                {book.contactPhone}
              </a>
            )}
            {book.contactEmail && (
              <a href={`mailto:${book.contactEmail}`} className="flex items-center gap-1.5 hover:text-accent-yellow">
                <Mail className="h-3 w-3" />
                {book.contactEmail}
              </a>
            )}
            {book.contactZaloUrl && (
              <a href={book.contactZaloUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-accent-yellow">
                <MessageCircle className="h-3 w-3" />
                Zalo
              </a>
            )}
            {book.contactMessengerUrl && (
              <a href={book.contactMessengerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-accent-yellow">
                <MessageCircle className="h-3 w-3" />
                Messenger
              </a>
            )}
          </div>
        )}
        {onAction && (
          <Button variant="outline" size="sm" className="w-full focus-visible:ring-2" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </article>
  )
}

function BookCardCover({
  bookId,
  imageUrls,
  title,
  compact,
}: {
  bookId: string
  imageUrls: string[]
  title: string
  compact?: boolean
}) {
  const imageUrl = imageUrls[0]?.trim() || ILLUSTRATIONS.defaultCover

  return (
    <div id={`book-cover-${bookId}`} className="h-full w-full">
      <ImageWithSkeleton
        src={imageUrl}
        fallbackSrc={ILLUSTRATIONS.defaultCover}
        alt={`Bìa sách ${title}`}
        width={600}
        height={800}
        loading="lazy"
        sizes={compact
          ? '(max-width: 420px) 92vw, (max-width: 1024px) 46vw, 360px'
          : '(max-width: 640px) 92vw, (max-width: 1280px) 44vw, 360px'}
        wrapperClassName={compact ? 'mx-auto h-full w-full p-3' : 'h-full w-full'}
        className={clsx(
          'h-full w-full transition-transform duration-500 group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100',
          compact ? 'object-contain' : 'object-cover',
        )}
      />
    </div>
  )
}
