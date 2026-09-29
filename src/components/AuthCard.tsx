import { Link } from 'react-router-dom'
import { FadeIn } from './FadeIn'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footerText?: string
  footerLink?: string
  footerLinkLabel?: string
}

export function AuthCard({
  title,
  subtitle,
  children,
  footerText,
  footerLink,
  footerLinkLabel,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-20">
      <div className="noise-overlay absolute inset-0" aria-hidden="true" />
      <FadeIn className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-card-lg p-8">
          <h1 className="mb-2 text-2xl font-black text-text-primary">{title}</h1>
          {subtitle && <p className="mb-8 text-text-muted">{subtitle}</p>}
          {children}
          {footerText && footerLink && (
            <p className="mt-6 text-center text-sm text-text-muted">
              {footerText}{' '}
              <Link to={footerLink} className="font-medium text-accent-yellow hover:underline">
                {footerLinkLabel}
              </Link>
            </p>
          )}
        </div>
      </FadeIn>
    </div>
  )
}
