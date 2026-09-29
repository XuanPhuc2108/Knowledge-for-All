import { BookOpen } from 'lucide-react'
import { GradientButton } from './GradientButton'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-yellow/20 bg-accent-yellow/[0.08] ring-1 ring-glass/5">
        {icon ?? <BookOpen className="h-10 w-10 text-accent-yellow" />}
      </div>
      <h3 className="mb-2 text-lg font-bold text-text-primary">{title}</h3>
      {description && (
        <p className="mb-7 max-w-md text-sm leading-relaxed text-text-muted">{description}</p>
      )}
      {actionLabel && onAction && (
        <GradientButton onClick={onAction}>{actionLabel}</GradientButton>
      )}
    </div>
  )
}
