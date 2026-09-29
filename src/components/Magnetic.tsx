import { useCallback, useRef, type ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface MagneticProps {
  children: ReactNode
  strength?: number
  padding?: number
  activeTransition?: string
  inactiveTransition?: string
  className?: string
}

export function Magnetic({
  children,
  strength = 4,
  padding = 80,
  activeTransition = 'transform 0.25s ease-out',
  inactiveTransition = 'transform 0.5s ease',
  className = '',
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduced || isTouch || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const x = e.clientX - (rect.left + rect.width / 2)
      const y = e.clientY - (rect.top + rect.height / 2)
      const dist = Math.sqrt(x * x + y * y)
      const maxDist = Math.max(rect.width, rect.height) / 2 + padding
      if (dist > maxDist) return
      ref.current.style.transition = activeTransition
      ref.current.style.transform = `translate3d(${x / strength}px, ${y / strength}px, 0)`
    },
    [strength, padding, activeTransition, reduced, isTouch],
  )

  const handleLeave = useCallback(() => {
    if (!ref.current) return
    ref.current.style.transition = inactiveTransition
    ref.current.style.transform = 'translate3d(0, 0, 0)'
  }, [inactiveTransition])

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ willChange: reduced || isTouch ? undefined : 'transform' }}
    >
      {children}
    </div>
  )
}
