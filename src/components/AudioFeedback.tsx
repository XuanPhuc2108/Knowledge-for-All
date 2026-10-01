import { useEffect, useRef } from 'react'
import { useAppSettings } from '../hooks/useAppSettings'
import { playSound, unlockSound } from '../lib/soundEffects'

export function AudioFeedback() {
  const { settings: { soundEnabled, soundVolume } } = useAppSettings()
  const welcomed = useRef(false)
  const firstControl = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!soundEnabled) return

    const onUnlock = (event: Event) => {
      if (!event.isTrusted) return
      firstControl.current = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-sound]')
        : null
      if (welcomed.current) {
        void unlockSound()
        return
      }
      welcomed.current = true
      if (firstControl.current?.dataset.sound !== 'off') {
        void unlockSound().then(() => playSound('open', soundVolume))
      } else {
        void unlockSound()
      }
    }
    const onClick = (event: MouseEvent) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return
      const control = event.target.closest<HTMLElement>('[data-sound]')
      if (control === firstControl.current) {
        firstControl.current = null
        return
      }
      if (!control || control.dataset.sound === 'off' || control.getAttribute('aria-disabled') === 'true') return
      switch (control.dataset.sound) {
        case 'tap':
        case 'primary':
        case 'favorite':
        case 'open':
        case 'close':
        case 'warning':
          if (welcomed.current) playSound(control.dataset.sound, soundVolume)
          break
      }
    }

    document.addEventListener('pointerdown', onUnlock, { capture: true, passive: true })
    document.addEventListener('keydown', onUnlock, true)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('pointerdown', onUnlock, true)
      document.removeEventListener('keydown', onUnlock, true)
      document.removeEventListener('click', onClick)
    }
  }, [soundEnabled, soundVolume])

  return null
}
