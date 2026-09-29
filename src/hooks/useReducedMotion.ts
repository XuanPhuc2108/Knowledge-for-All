import { useContext, useEffect, useState } from 'react'
import { AppSettingsContext } from './appSettingsContext'

export function useReducedMotion(): boolean {
  const context = useContext(AppSettingsContext)
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (context) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [context])

  return context ? context.effectiveMotion === 'reduced' : reduced
}
