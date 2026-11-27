import { useEffect, useState } from 'react'
import { getOtpResendCooldownRemaining, OTP_RESEND_COOLDOWN_SECONDS } from '../lib/authFlow'

export function useOtpResendCooldown() {
  const [lastSentAt, setLastSentAt] = useState<number | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  useEffect(() => {
    if (lastSentAt === null) return

    const updateRemaining = () => {
      const remaining = getOtpResendCooldownRemaining(lastSentAt)
      setSecondsRemaining(remaining)
      if (remaining === 0) setLastSentAt(null)
    }
    const intervalId = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(intervalId)
  }, [lastSentAt])

  return {
    secondsRemaining,
    startCooldown: () => {
      setLastSentAt(Date.now())
      setSecondsRemaining(OTP_RESEND_COOLDOWN_SECONDS)
    },
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  }
}
