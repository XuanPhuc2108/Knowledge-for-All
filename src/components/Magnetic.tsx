import { useCallback, useRef, type MouseEvent, type ReactNode } from 'react'
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
  const bounds = useRef<DOMRect | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const frame = useRef(0)
  const reduced = useReducedMotion()
  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window

  const handleEnter = useCallback(() => {
    if (reduced || isTouch || !ref.current) return
    bounds.current = ref.current.getBoundingClientRect()
    ref.current.style.willChange = 'transform'
  }, [reduced, isTouch])

  const handleMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const rect = bounds.current
    if (reduced || isTouch || !rect) return
    pointer.current = { x: event.clientX, y: event.clientY }
    if (frame.current) return
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0
      if (!ref.current) return
      const x = pointer.current.x - (rect.left + rect.width / 2)
      const y = pointer.current.y - (rect.top + rect.height / 2)
      const dist = Math.sqrt(x * x + y * y)
      const maxDist = Math.max(rect.width, rect.height) / 2 + padding
      if (dist > maxDist) return
      ref.current.style.transition = activeTransition
      ref.current.style.transform = `translate3d(${x / strength}px, ${y / strength}px, 0)`
    })
  }, [strength, padding, activeTransition, reduced, isTouch])

  const handleLeave = useCallback(() => {
    if (frame.current) window.cancelAnimationFrame(frame.current)
    frame.current = 0
    bounds.current = null
    if (!ref.current) return
    ref.current.style.transition = inactiveTransition
    ref.current.style.transform = 'translate3d(0, 0, 0)'
    ref.current.style.willChange = 'auto'
  }, [inactiveTransition])

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  )
}
