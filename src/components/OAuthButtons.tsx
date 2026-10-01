import { useState } from 'react'
import { signInWithOAuthProvider } from '../lib/supabase'
import { userFacingError } from '../lib/userFacingError'

interface OAuthButtonsProps {
  disabled?: boolean
  googleLabel: string
  facebookLabel: string
  googleBusyLabel: string
  facebookBusyLabel: string
  onError: (message: string) => void
  onBusyChange?: (busy: boolean) => void
}

export function OAuthButtons({
  disabled,
  googleLabel,
  facebookLabel,
  googleBusyLabel,
  facebookBusyLabel,
  onError,
  onBusyChange,
}: OAuthButtonsProps) {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)
  const busy = googleLoading || facebookLoading

  const setProviderLoading = (provider: 'google' | 'facebook', value: boolean) => {
    if (provider === 'google') setGoogleLoading(value)
    else setFacebookLoading(value)
    onBusyChange?.(value || (provider === 'google' ? facebookLoading : googleLoading))
  }

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setProviderLoading(provider, true)
    try {
      const { error } = await signInWithOAuthProvider(provider)
      if (error) throw error
    } catch (e) {
      console.error(`Unable to start ${provider} OAuth`, e)
      onError(userFacingError(
        e,
        provider === 'google' ? 'Chưa thể kết nối Google. Hãy thử lại nha.' : 'Chưa thể kết nối Facebook. Hãy thử lại nha.',
      ))
      setProviderLoading(provider, false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleOAuth('google')}
        disabled={disabled || busy}
        className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.82)] px-5 py-3 text-sm font-semibold text-text-primary transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-glass/20 hover:bg-[rgb(var(--color-interactive-hover)/.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-white text-base font-bold text-[#4285F4]">
          G
        </span>
        {googleLoading ? googleBusyLabel : googleLabel}
      </button>
      <button
        type="button"
        onClick={() => void handleOAuth('facebook')}
        disabled={disabled || busy}
        className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.82)] px-5 py-3 text-sm font-semibold text-text-primary transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-glass/20 hover:bg-[rgb(var(--color-interactive-hover)/.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-[#1877F2] text-sm font-bold text-white">
          f
        </span>
        {facebookLoading ? facebookBusyLabel : facebookLabel}
      </button>
    </div>
  )
}
