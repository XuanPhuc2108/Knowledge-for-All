import { useMemo } from 'react'
import { haversineDistance, polarToCartesian } from '../lib/geo'
import type { Book } from '../types/book'
import { EmptyState } from './EmptyState'

interface NearbyRadarProps {
  books: Book[]
  userLat?: number
  userLng?: number
  maxRadiusMeters?: number
  size?: number
  showEmpty?: boolean
}

export function NearbyRadar({
  books,
  userLat,
  userLng,
  maxRadiusMeters = 5000,
  size = 280,
  showEmpty = true,
}: NearbyRadarProps) {
  const locatedBooks = books.filter((b) => b.latitude && b.longitude)
  const center = size / 2
  const maxR = size / 2 - 20

  const dots = useMemo(() => {
    if (!userLat || !userLng) return []
    return locatedBooks.map((book, i) => {
      const dist = haversineDistance(userLat, userLng, book.latitude!, book.longitude!)
      const ratio = Math.min(dist / maxRadiusMeters, 1)
      const angle = (i / Math.max(locatedBooks.length, 1)) * Math.PI * 2
      const r = ratio * maxR
      const pos = polarToCartesian(center, center, r, angle)
      return { ...book, x: pos.x, y: pos.y, dist }
    })
  }, [locatedBooks, userLat, userLng, maxRadiusMeters, center, maxR])

  if (locatedBooks.length === 0 && showEmpty) {
    return (
      <EmptyState
        title="Chưa có sách có vị trí"
        description="Khi người dùng đăng sách kèm vị trí, chúng sẽ hiển thị trên radar."
        icon={
          <div className="relative h-16 w-16">
            {[1, 2, 3].map((ring) => (
              <span
                key={ring}
                className="absolute inset-0 rounded-full border border-accent-teal/30"
                style={{ transform: `scale(${ring * 0.33})` }}
              />
            ))}
          </div>
        }
      />
    )
  }

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Radar sách gần bạn"
    >
      {[1, 2, 3, 4].map((ring) => (
        <span
          key={ring}
          className="absolute rounded-full border border-white/10"
          style={{
            inset: `${(ring - 1) * 12}%`,
            animation: ring === 4 ? 'pulse 2s ease-in-out infinite' : undefined,
          }}
        />
      ))}

      <span className="absolute left-1/2 top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-yellow shadow-lg shadow-accent-yellow/50" />

      {dots.map((dot) => (
        <span
          key={dot.id}
          className="absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-teal shadow-md shadow-accent-teal/40"
          style={{ left: dot.x, top: dot.y }}
          title={dot.title}
        />
      ))}

      {!userLat && locatedBooks.length > 0 && (
        <p className="absolute -bottom-8 left-0 right-0 text-center text-xs text-text-muted">
          Bật định vị để xem khoảng cách thực tế
        </p>
      )}
    </div>
  )
}
