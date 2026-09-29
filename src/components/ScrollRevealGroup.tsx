import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface ScrollRevealGroupProps {
  children: ReactNode
  className?: string
  selector?: string
  stagger?: number
}

export function ScrollRevealGroup({
  children,
  className,
  selector = '[data-scroll-reveal]',
  stagger = 0.08,
}: ScrollRevealGroupProps) {
  const scopeRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || !scopeRef.current) return

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(selector)
      gsap.set(items, { opacity: 0, y: 34 })
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger,
            ease: 'power3.out',
            clearProps: 'transform',
          })
        },
      })
    }, scopeRef)

    return () => ctx.revert()
  }, [reduced, selector, stagger])

  return (
    <div ref={scopeRef} className={className}>
      {children}
    </div>
  )
}
