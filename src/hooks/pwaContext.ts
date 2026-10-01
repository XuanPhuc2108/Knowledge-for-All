import { createContext, useContext } from 'react'

export interface PwaInstallContextValue {
  canInstall: boolean
  installed: boolean
  isIOS: boolean
  updateAvailable: boolean
  install: () => Promise<boolean>
  updateApp: () => void
}

export const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

export function usePwaInstall(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext)
  if (!context) throw new Error('usePwaInstall phải dùng trong PwaInstallProvider')
  return context
}
