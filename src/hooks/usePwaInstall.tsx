import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { PwaInstallContext, type PwaInstallContextValue } from './pwaContext'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
        console.error('Không thể đăng ký service worker', error)
      })
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) setInstalled(true)
    }
    const displayMode = window.matchMedia('(display-mode: standalone)')

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    displayMode.addEventListener('change', onDisplayModeChange)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      displayMode.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) return false
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    setPromptEvent(null)
    return choice.outcome === 'accepted'
  }, [promptEvent])

  const value = useMemo<PwaInstallContextValue>(() => ({
    canInstall: Boolean(promptEvent),
    installed,
    isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(navigator as Navigator & { standalone?: boolean }).standalone,
    install,
  }), [install, installed, promptEvent])

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>
}
