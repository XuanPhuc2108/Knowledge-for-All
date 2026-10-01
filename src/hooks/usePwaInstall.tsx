import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PwaInstallContext, type PwaInstallContextValue } from './pwaContext'
import { Button } from '../components/Button'

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
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null)
  const approvedUpdate = useRef(false)

  useEffect(() => {
    let cancelled = false
    let registration: ServiceWorkerRegistration | undefined
    let installingWorker: ServiceWorker | null = null
    const checkWaitingWorker = () => {
      if (registration?.waiting && navigator.serviceWorker.controller) {
        setUpdateWorker(registration.waiting)
      }
    }
    const onWorkerStateChange = () => {
      if (installingWorker?.state === 'installed') checkWaitingWorker()
    }
    const onUpdateFound = () => {
      installingWorker = registration?.installing ?? null
      installingWorker?.addEventListener('statechange', onWorkerStateChange)
    }

    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').then((currentRegistration) => {
        if (cancelled) return
        registration = currentRegistration
        checkWaitingWorker()
        registration.addEventListener('updatefound', onUpdateFound)
      }).catch((error: unknown) => {
        if (!cancelled) console.error('Unable to register the Booki service worker', error)
      })
    }

    const onControllerChange = () => {
      if (!approvedUpdate.current) return
      approvedUpdate.current = false
      window.location.reload()
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
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange)
    displayMode.addEventListener('change', onDisplayModeChange)
    return () => {
      cancelled = true
      registration?.removeEventListener('updatefound', onUpdateFound)
      installingWorker?.removeEventListener('statechange', onWorkerStateChange)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)
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

  const updateApp = useCallback(() => {
    if (!updateWorker || !window.confirm('Tải bản cập nhật Booki ngay? Nếu đang nhập nội dung, hãy lưu trước khi tiếp tục.')) return
    approvedUpdate.current = true
    updateWorker.postMessage({ type: 'SKIP_WAITING' })
  }, [updateWorker])

  const value = useMemo<PwaInstallContextValue>(() => ({
    canInstall: Boolean(promptEvent),
    installed,
    isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(navigator as Navigator & { standalone?: boolean }).standalone,
    updateAvailable: Boolean(updateWorker),
    install,
    updateApp,
  }), [install, installed, promptEvent, updateApp, updateWorker])

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      {updateWorker && (
        <aside className="fixed inset-x-0 bottom-4 z-[120] flex justify-center px-4" aria-live="polite">
          <div className="glass-card flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl p-3 shadow-lg">
            <p className="text-sm text-text-primary">Đã có phiên bản Booki mới. Cập nhật để sử dụng phiên bản mới nhất.</p>
            <Button size="sm" onClick={updateApp}>Cập nhật</Button>
          </div>
        </aside>
      )}
    </PwaInstallContext.Provider>
  )
}
