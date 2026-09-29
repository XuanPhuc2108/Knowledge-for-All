import { motion } from 'framer-motion'
import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

type FadeInProps<T extends ElementType = 'div'> = {
  as?: T
  delay?: number
  duration?: number
  x?: number
  y?: number
  once?: boolean
  children: React.ReactNode
  className?: string
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>

const motionComponents = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  span: motion.span,
} as const

export function FadeIn<T extends ElementType = 'div'>({
  as = 'div' as T,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  once = true,
  children,
  className,
  ...rest
}: FadeInProps<T>) {
  const reduced = useReducedMotion()
  const Component = (motionComponents[as as keyof typeof motionComponents] ?? motion.div) as typeof motion.div

  if (reduced) {
    const Static = as as ElementType
    return (
      <Static className={className} {...rest}>
        {children}
      </Static>
    )
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: '-50px' }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      {...rest}
    >
      {children}
    </Component>
  )
}
