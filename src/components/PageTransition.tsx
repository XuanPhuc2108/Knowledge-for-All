import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()

  if (reduced) return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}
