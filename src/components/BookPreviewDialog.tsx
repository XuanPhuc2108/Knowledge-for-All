import { AnimatePresence, motion } from 'framer-motion'
import { Heart, MapPin, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CONDITION_LABELS, EXCHANGE_LABELS, STATUS_LABELS } from '../lib/constants'
import { getAdapter } from '../lib/dataAdapter'
import { formatDistance } from '../lib/geo'
import { ILLUSTRATIONS } from '../lib/images'
import type { BookWithDistance } from '../types/book'
import { Button } from './Button'
import { ImageWithSkeleton } from './ImageWithSkeleton'

interface BookPreviewDialogProps {
  book: BookWithDistance | null
  onClose: () => void
  onDetails: (book: BookWithDistance) => void
  isFavorite?: boolean
  onFavorite?: (bookId: string) => void
}

export function BookPreviewDialog({
  book,
  onClose,
  onDetails,
  isFavorite = false,
  onFavorite,
}: BookPreviewDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [loadedImages, setLoadedImages] = useState<{ bookId: string; imageUrls: string[] } | null>(null)
  const loadedImageUrls = loadedImages && loadedImages.bookId === book?.id
    ? loadedImages.imageUrls
    : null

  useEffect(() => {
    if (!book) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [book, onClose])

  useEffect(() => {
    if (!book || book.imageUrls.length > 0) return
    let active = true
    void getAdapter().getBookImages(book.id)
      .then((imageUrls) => {
        if (active) setLoadedImages({ bookId: book.id, imageUrls })
      })
      .catch((cause: unknown) => {
        console.warn('Unable to load preview book cover', cause)
        if (active) setLoadedImages({ bookId: book.id, imageUrls: [] })
      })
    return () => { active = false }
  }, [book])

  return (
    <AnimatePresence>
      {book && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-dark/75 p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-preview-title"
            className="glass-card max-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl border border-glass/15 bg-[rgb(var(--color-dark-secondary)/.98)] p-4 shadow-[0_28px_90px_rgb(0_0_0_/_0.4)] sm:rounded-3xl sm:p-6"
            initial={{ opacity: 0, y: 28, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.99 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-yellow">Xem nhanh</p>
              <button
                ref={closeButtonRef}
                type="button"
                data-sound="close"
                onClick={onClose}
                aria-label="Đóng xem nhanh"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] sm:items-center">
              <div className="relative mx-auto aspect-[4/3] w-full max-w-[18rem] overflow-hidden rounded-2xl bg-[rgb(var(--color-interactive-surface)/.75)] sm:aspect-[3/4]">
                <ImageWithSkeleton
                  src={book.imageUrls[0] || loadedImageUrls?.[0] || ILLUSTRATIONS.defaultCover}
                  fallbackSrc={ILLUSTRATIONS.defaultCover}
                  alt={`Bìa sách ${book.title}`}
                  width={600}
                  height={800}
                  loading="lazy"
                  sizes="(max-width: 640px) 88vw, 220px"
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-contain"
                />
                {onFavorite && (
                  <button
                    type="button"
                    data-sound="favorite"
                    onClick={() => onFavorite(book.id)}
                    aria-label={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                    aria-pressed={isFavorite}
                    className="absolute bottom-2 right-2 grid min-h-11 min-w-11 place-items-center rounded-full bg-dark/80 text-text-primary shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
                  >
                    <Heart className={`h-5 w-5 ${isFavorite ? 'fill-accent-rose text-accent-rose' : ''}`} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent-yellow/10 px-2.5 py-1 text-xs font-semibold text-accent-yellow">{STATUS_LABELS[book.status]}</span>
                  <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.85)] px-2.5 py-1 text-xs text-text-muted">{EXCHANGE_LABELS[book.exchangeType]}</span>
                </div>
                <h2 id="book-preview-title" className="text-xl font-black leading-snug text-text-primary">{book.title}</h2>
                {book.author && <p className="mt-1 text-sm text-text-muted">{book.author}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.85)] px-2.5 py-1 text-text-muted">{book.category}</span>
                  <span className="rounded-full bg-[rgb(var(--color-interactive-surface)/.85)] px-2.5 py-1 text-text-muted">{CONDITION_LABELS[book.condition]}</span>
                </div>
                <p className="mt-3 text-sm text-text-muted">
                  Người chia sẻ: <span className="font-semibold text-text-primary">{book.ownerName}</span>
                </p>
                {book.distanceMeters !== undefined && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-accent-teal">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> Khoảng {formatDistance(book.distanceMeters)}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button className="flex-1" onClick={() => onDetails(book)}>Xem chi tiết</Button>
                  <Button variant="outline" onClick={onClose}>Đóng</Button>
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
