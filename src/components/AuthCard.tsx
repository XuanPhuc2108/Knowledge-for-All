import { BookOpen } from 'lucide-react'
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
      <div className="noise-overlay absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-accent-yellow/[0.07] blur-3xl" aria-hidden="true" />
      <FadeIn className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-[1.75rem] p-6 sm:p-9">
          <div className="mb-7">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-yellow/20 bg-accent-yellow/10 text-accent-yellow">
              <BookOpen aria-hidden="true" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-[1.75rem]">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-text-muted">{subtitle}</p>}
          </div>
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
