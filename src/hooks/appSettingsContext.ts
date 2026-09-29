import { createContext } from 'react'
import type { AppSettings, MotionLevel } from './appSettingsTypes'

export const AppSettingsContext = createContext<{
  settings: AppSettings
  effectiveMotion: MotionLevel
  initialized: boolean
  setSettings: (settings: AppSettings | ((current: AppSettings) => AppSettings)) => void
} | null>(null)
