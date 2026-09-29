import { useContext } from 'react'
import { ToastContext } from '../components/toastContext'

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast phải dùng trong ToastProvider')
  return context
}
