import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function useGsapContext(
  callback: (ctx: gsap.Context) => void,
  deps: React.DependencyList = [],
) {
  const scopeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scopeRef.current) return
    const ctx = gsap.context(callback, scopeRef)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return scopeRef
}
