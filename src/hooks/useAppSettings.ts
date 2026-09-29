import { useContext } from 'react'
import { AppSettingsContext } from './appSettingsContext'

export function useAppSettings() {
  const context = useContext(AppSettingsContext)
  if (!context) throw new Error('useAppSettings phải dùng trong AppSettingsProvider')
  return context
}
