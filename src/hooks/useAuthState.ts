import { useContext } from 'react'
import { AuthContext } from './authContext'
import type { AuthContextValue } from '../types/auth'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth phải dùng trong AuthProvider')
  return context
}
