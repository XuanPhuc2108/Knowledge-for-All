import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookCard } from '../components/BookCard'
import { EmptyState } from '../components/EmptyState'
import { FadeIn } from '../components/FadeIn'
import { useBooks } from '../hooks/useBooks'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useAuth } from '../hooks/useAuthState'

export function BookCarousel3DSection() {
  const { books, loading } = useBooks(8)
  const { user } = useAuth()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (reduced || books.length === 0 || !inView) return

    const timer = window.setInterval(() => {
      if (document.hidden) return
      setActiveIndex((i) => (i + 1) % books.length)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [books.length, reduced, inView])

  const handleFirstBook = () => {
    navigate(user ? '/app/add-book' : '/register')
  }

  return (
    <section ref={sectionRef} className="px-5 py-20 sm:px-8 md:py-32 lg:px-16">
      <FadeIn className="mb-12 text-center">
        <h2 className="font-black text-text-primary" style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}>
          Thư viện cộng đồng
        </h2>
      </FadeIn>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" />
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          title="Chưa có sách nào trong thư viện cộng đồng."
          description="Hãy là người đầu tiên chia sẻ quyển sách của bạn."
          actionLabel="Đăng quyển sách đầu tiên"
          onAction={handleFirstBook}
        />
      ) : reduced ? (
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {books.slice(0, 6).map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div
          className="relative mx-auto flex h-[480px] items-center justify-center"
          style={{ perspective: '1400px' }}
        >
          {books.map((book, i) => {
            const offset = i - activeIndex
            const absOffset = Math.abs(offset)
            const visible = absOffset <= 3
            if (!visible) return null

            return (
              <div
                key={book.id}
                className="absolute transition-all duration-700 ease-out"
                style={{
                  transform: `
                    rotateX(${offset * -15}deg)
                    translateZ(${-absOffset * 80}px)
                    translateY(${offset * 40}px)
                    scale(${1 - absOffset * 0.08})
                  `,
                  opacity: absOffset > 2 ? 0.3 : 1 - absOffset * 0.15,
                  zIndex: 10 - absOffset,
                  willChange: absOffset <= 1 ? 'transform' : undefined,
                }}
              >
                <BookCard book={book} compact />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
