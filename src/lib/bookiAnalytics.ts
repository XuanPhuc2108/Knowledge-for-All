import { track } from '@vercel/analytics/react'

export function trackBookiEvent(
  name: 'booki_referral_visit' | 'booki_share',
  properties: Record<string, string>,
) {
  try {
    track(name, properties)
  } catch (cause) {
    console.warn('Unable to record a Booki analytics event', cause)
  }
}
