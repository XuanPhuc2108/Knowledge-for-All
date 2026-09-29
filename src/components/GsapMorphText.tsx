import clsx from 'clsx'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, type ElementType } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

const GRADIENT =
  'linear-gradient(90deg, #FFE9A3 0%, #FFD84D 38%, #D6A62E 72%, #FFE9A3 100%)'

const GRADIENT_STYLE = {
  background: GRADIENT,
  backgroundSize: '300% auto',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as const

interface GsapMorphTextProps {
  text: string
  className?: string
  as?: ElementType
  splitBy?: 'char' | 'word'
  reveal?: 'mount' | 'scroll' | 'none'
  morph?: boolean
  wave?: boolean
}

export function GsapMorphText({
  text,
  className = '',
  as: Tag = 'span',
  splitBy = 'char',
  reveal = 'mount',
  morph = true,
  wave = false,
}: GsapMorphTextProps) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  const parts =
    splitBy === 'word'
      ? text.split(' ').map((w, i, arr) => (i < arr.length - 1 ? `${w} ` : w))
      : text.split('').map((c) => (c === ' ' ? '\u00A0' : c))

  useEffect(() => {
    if (reduced || !rootRef.current || reveal === 'none') return

    const chars = rootRef.current.querySelectorAll<HTMLElement>('.gsap-morph-part')

    const ctx = gsap.context(() => {
      if (reveal === 'mount') {
        gsap.from(chars, {
          yPercent: 110,
          opacity: 0,
          rotateX: -55,
          filter: 'blur(8px)',
          duration: 1.05,
          stagger: splitBy === 'char' ? 0.035 : 0.12,
          ease: 'power4.out',
        })
      } else if (reveal === 'scroll') {
        gsap.from(chars, {
          yPercent: 110,
          opacity: 0,
          rotateX: -55,
          filter: 'blur(8px)',
          duration: 1.05,
          stagger: splitBy === 'char' ? 0.035 : 0.12,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        })
      }

      if (morph) {
        gsap.to(chars, {
          backgroundPosition: '300% center',
          duration: 7,
          ease: 'none',
          repeat: -1,
        })
      }

      if (wave && chars.length > 0) {
        gsap.to(chars, {
          y: -5,
          duration: 1.8,
          ease: 'sine.inOut',
          stagger: { each: 0.06, from: 'center', yoyo: true, repeat: -1 },
        })
      }
    }, rootRef)

    return () => ctx.revert()
  }, [reduced, text, reveal, morph, wave, splitBy])

  if (reduced) {
    return (
      <Tag className={clsx(className, morph && 'text-gold-gradient')} aria-label={text}>
        {text}
      </Tag>
    )
  }

  return (
    <Tag ref={rootRef} className={className} aria-label={text}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" style={{ perspective: '800px', display: 'inline' }}>
        {parts.map((part, i) => (
          <span
            key={`${part}-${i}`}
            className="gsap-morph-part inline-block will-change-transform"
            style={{
              transformOrigin: '50% 100%',
              transformStyle: 'preserve-3d',
              ...(morph ? GRADIENT_STYLE : { color: 'rgb(var(--color-text-primary))' }),
            }}
          >
            {part}
          </span>
        ))}
      </span>
    </Tag>
  )
}
