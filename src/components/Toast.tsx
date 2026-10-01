import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { ToastContext, type ToastItem, type ToastType } from './toastContext'
import { useAppSettings } from '../hooks/useAppSettings'
import { playSound } from '../lib/soundEffects'

export function ToastProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppSettings()
  const settingsRef = useRef(settings)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
      timers.current.clear()
    },
    [],
  )

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    if (settingsRef.current.soundEnabled && type !== 'info') {
      playSound(type === 'success' ? 'success' : 'error', settingsRef.current.soundVolume)
    }
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
      timers.current.delete(id)
    }, 4000)
    timers.current.set(id, timer)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-[200] flex flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={clsx(
                'pointer-events-auto rounded-2xl px-5 py-3 text-sm font-medium shadow-xl backdrop-blur-md',
                toast.type === 'success' && 'bg-accent-teal/90 text-dark',
                toast.type === 'error' && 'bg-accent-rose/90 text-white',
                toast.type === 'info' && 'glass-card text-text-primary',
              )}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
