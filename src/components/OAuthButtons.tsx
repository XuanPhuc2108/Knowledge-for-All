import { useState } from 'react'
import { signInWithOAuthProvider } from '../lib/supabase'
import { userFacingError } from '../lib/userFacingError'

interface OAuthButtonsProps {
  disabled?: boolean
  googleLabel: string
  googleBusyLabel: string
  redirectTo?: string
  onError: (message: string) => void
  onBusyChange?: (busy: boolean) => void
}

export function OAuthButtons({
  disabled,
  googleLabel,
  googleBusyLabel,
  redirectTo = '/app',
  onError,
  onBusyChange,
}: OAuthButtonsProps) {
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleOAuth = async () => {
    setGoogleLoading(true)
    onBusyChange?.(true)
    try {
      const { error } = await signInWithOAuthProvider('google', redirectTo)
      if (error) throw error
    } catch (e) {
      console.error('Unable to start Google OAuth', e)
      onError(userFacingError(e, 'Chưa thể kết nối Google. Vui lòng thử lại.'))
      setGoogleLoading(false)
      onBusyChange?.(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleOAuth()}
        disabled={disabled || googleLoading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.82)] px-5 py-3 text-sm font-semibold text-text-primary transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-glass/20 hover:bg-[rgb(var(--color-interactive-hover)/.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-white text-base font-bold text-[#4285F4]">
          G
        </span>
        {googleLoading ? googleBusyLabel : googleLabel}
      </button>
    </div>
  )
}
