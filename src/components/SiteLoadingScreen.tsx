import { BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import './SiteLoadingScreen.css'

interface SiteLoadingScreenProps {
  ready: boolean
}

export function SiteLoadingScreen({ ready }: SiteLoadingScreenProps) {
  const [exitComplete, setExitComplete] = useState(false)
  const [showSlowNote, setShowSlowNote] = useState(false)

  useEffect(() => {
    if (!ready) return
    const timeout = window.setTimeout(() => setExitComplete(true), 220)
    return () => window.clearTimeout(timeout)
  }, [ready])

  useEffect(() => {
    if (ready) return
    const timeout = window.setTimeout(() => setShowSlowNote(true), 9000)
    return () => window.clearTimeout(timeout)
  }, [ready])

  if (exitComplete) return null
  const phase = ready ? 'exiting' : 'loading'

  return (
    <div
      className={`site-loading-screen${phase === 'exiting' ? ' is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      aria-hidden={phase === 'exiting' || undefined}
    >
      <div className="site-loading-ambient site-loading-ambient-gold" aria-hidden="true" />
      <div className="site-loading-ambient site-loading-ambient-warm" aria-hidden="true" />

      <div className="site-loading-content">
        <div className="site-loading-brand-mark" aria-hidden="true">
          <span className="site-loading-mark-ring" />
          <span className="site-loading-mark-inner">
            <BookOpen />
          </span>
        </div>

        <p className="site-loading-brand-name">Booki</p>
        <p className="site-loading-status">Đang chuẩn bị trải nghiệm của bạn…</p>
        <div className="site-loading-progress" aria-hidden="true">
          <span />
        </div>
        {showSlowNote && !ready && (
          <p className="site-loading-slow-note">
            Quá trình khởi động đang mất thêm thời gian một chút.
          </p>
        )}
      </div>
    </div>
  )
}
