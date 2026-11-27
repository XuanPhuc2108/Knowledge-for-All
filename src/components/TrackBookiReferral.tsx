import { useEffect } from 'react'
import { trackBookiEvent } from '../lib/bookiAnalytics'
import { getBookiShareReferral } from '../lib/bookSharing'

let trackedReferralLocation: string | null = null

export function TrackBookiReferral() {
  useEffect(() => {
    const referral = getBookiShareReferral(window.location.search)
    const location = `${window.location.pathname}${window.location.search}`
    if (!referral || trackedReferralLocation === location) return
    trackedReferralLocation = location
    trackBookiEvent('booki_referral_visit', referral)
  }, [])

  return null
}
