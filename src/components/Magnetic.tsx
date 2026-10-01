import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface MagneticProps {
  children: ReactNode
  strength?: number
  padding?: number
  className?: string
}

export function Magnetic({
  children,
  strength = 4,
  padding = 80,
  className = '',
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)
  const bounds = useRef<DOMRect | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })
  const position = useRef({ x: 0, y: 0 })
  const frame = useRef<number | null>(null)
  const reduced = useReducedMotion()
  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window

  useEffect(() => () => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current)
  }, [])

  const animateToTarget = useCallback(() => {
    if (frame.current !== null || !ref.current) return
    const step = () => {
      const element = ref.current
      if (!element) {
        frame.current = null
        return
      }

      position.current.x += (target.current.x - position.current.x) * 0.18
      position.current.y += (target.current.y - position.current.y) * 0.18

      if (
        Math.abs(target.current.x - position.current.x) < 0.05 &&
        Math.abs(target.current.y - position.current.y) < 0.05
      ) {
        position.current = { ...target.current }
        frame.current = null
        element.style.transform = `translate3d(${position.current.x}px, ${position.current.y}px, 0)`
        if (position.current.x === 0 && position.current.y === 0) element.style.willChange = 'auto'
        return
      }

      element.style.transform = `translate3d(${position.current.x}px, ${position.current.y}px, 0)`
      frame.current = window.requestAnimationFrame(step)
    }
    frame.current = window.requestAnimationFrame(step)
  }, [])

  const handleEnter = useCallback(() => {
    if (reduced || isTouch || !ref.current) return
    bounds.current = ref.current.getBoundingClientRect()
    ref.current.style.willChange = 'transform'
  }, [reduced, isTouch])

  const handleMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const rect = bounds.current
    if (reduced || isTouch || !rect) return
    pointer.current = { x: event.clientX, y: event.clientY }
    const x = pointer.current.x - (rect.left + rect.width / 2)
    const y = pointer.current.y - (rect.top + rect.height / 2)
    const dist = Math.sqrt(x * x + y * y)
    const maxDist = Math.max(rect.width, rect.height) / 2 + padding
    target.current = dist <= maxDist ? { x: x / strength, y: y / strength } : { x: 0, y: 0 }
    animateToTarget()
  }, [strength, padding, reduced, isTouch, animateToTarget])

  const handleLeave = useCallback(() => {
    bounds.current = null
    target.current = { x: 0, y: 0 }
    animateToTarget()
  }, [animateToTarget])

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
