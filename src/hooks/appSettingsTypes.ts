export type AppTheme = 'dark' | 'light' | 'aurora' | 'system'
export type MotionPreference = 'auto' | 'reduced' | 'subtle' | 'full'
export type MotionLevel = Exclude<MotionPreference, 'auto'>

export interface AppSettings {
  theme: AppTheme
  notificationsEnabled: boolean
  motion: MotionPreference
}
