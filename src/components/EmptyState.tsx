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
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 ring-1 ring-glass">
        {icon ?? <BookOpen className="h-10 w-10 text-accent-yellow" />}
      </div>
      <h3 className="mb-2 text-xl font-bold text-text-primary">{title}</h3>
      {description && (
        <p className="mb-8 max-w-md text-text-muted">{description}</p>
      )}
      {actionLabel && onAction && (
        <GradientButton onClick={onAction}>{actionLabel}</GradientButton>
      )}
    </div>
  )
}
