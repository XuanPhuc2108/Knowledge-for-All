import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface AnimatedTextProps {
  text: string
  className?: string
  scrollReveal?: boolean
  splitBy?: 'word' | 'char'
}

export function AnimatedText({
  text,
  className = '',
  scrollReveal = false,
  splitBy = 'word',
}: AnimatedTextProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  })

  const parts = splitBy === 'char' ? text.split('') : text.split(' ')

  if (reduced || !scrollReveal) {
    return (
      <p className={className} aria-label={text}>
        {text}
      </p>
    )
  }

  return (
    <p ref={ref} className={className} aria-label={text}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {parts.map((part, i) => (
          <CharReveal key={i} progress={scrollYProgress} index={i} total={parts.length}>
            {splitBy === 'word' ? (i < parts.length - 1 ? `${part} ` : part) : part}
          </CharReveal>
        ))}
      </span>
    </p>
  )
}

function CharReveal({
  children,
  progress,
  index,
  total,
}: {
  children: string
  progress: ReturnType<typeof useScroll>['scrollYProgress']
  index: number
  total: number
}) {
  const start = index / total
  const end = (index + 1) / total
  const opacity = useTransform(progress, [start, end], [0.2, 1])

  return (
    <motion.span style={{ opacity }} className="inline">
      {children}
    </motion.span>
  )
}
