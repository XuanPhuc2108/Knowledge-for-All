import { useLayoutEffect } from 'react'

export function useBodyScrollLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return

    const body = document.body
    const documentElement = document.documentElement
    const scrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      htmlOverflow: documentElement.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.left = previous.left
      body.style.right = previous.right
      body.style.width = previous.width
      body.style.overflow = previous.overflow
      body.style.paddingRight = previous.paddingRight
      documentElement.style.overflow = previous.htmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}
