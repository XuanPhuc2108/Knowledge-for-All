import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppSettingsContext } from './appSettingsContext'
import type { AppSettings, MotionLevel, MotionPreference } from './appSettingsTypes'
import { useLocalStorage } from './useLocalStorage'

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  notificationsEnabled: false,
  motion: 'auto',
}

interface NavigatorWithCapabilities extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

function getDeviceMotionLevel(): MotionLevel {
  const device = navigator as NavigatorWithCapabilities
  const cores = navigator.hardwareConcurrency || 4
  const memory = device.deviceMemory
  if (device.connection?.saveData || cores <= 2 || (memory !== undefined && memory <= 2)) {
    return 'reduced'
  }
  if (cores >= 8 && memory !== undefined && memory >= 8) return 'full'
  return 'subtle'
}

function resolveMotionPreference(preference: MotionPreference, systemReduced: boolean): MotionLevel {
  if (systemReduced) return 'reduced'
  if (preference === 'auto') return getDeviceMotionLevel()
  return preference
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [storedSettings, setSettings] = useLocalStorage('sgn_app_settings', DEFAULT_SETTINGS)
  const settings = useMemo<AppSettings>(
    () => ({ ...DEFAULT_SETTINGS, ...storedSettings }),
    [storedSettings],
  )
  const updateSettings = useCallback(
    (next: AppSettings | ((current: AppSettings) => AppSettings)) => {
      setSettings((current) => {
        const normalized = { ...DEFAULT_SETTINGS, ...current }
        return typeof next === 'function' ? next(normalized) : { ...normalized, ...next }
      })
    },
    [setSettings],
  )
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [initialized, setInitialized] = useState(false)
  const effectiveMotion = resolveMotionPreference(settings.motion, systemReduced)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const effectiveTheme = settings.theme === 'system'
        ? media.matches ? 'dark' : 'light'
        : settings.theme
      document.documentElement.dataset.theme = effectiveTheme
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content',
        effectiveTheme === 'light' ? '#F3F1EB' : effectiveTheme === 'aurora' ? '#090D1A' : '#0B0D10',
      )
    }
    applyTheme()
    setInitialized(true)
    if (settings.theme !== 'system') return
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [settings.theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = (event: MediaQueryListEvent) => setSystemReduced(event.matches)
    media.addEventListener('change', updatePreference)
    return () => media.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.motion = effectiveMotion
  }, [effectiveMotion])

  const value = useMemo(
    () => ({ settings, effectiveMotion, initialized, setSettings: updateSettings }),
    [settings, effectiveMotion, initialized, updateSettings],
  )
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
}
