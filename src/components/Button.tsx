import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'app-button inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,transform,box-shadow] duration-200 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-dark disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-accent-yellow text-[rgb(var(--color-accent-contrast))] shadow-[0_5px_18px_rgb(var(--color-accent)/.12)]': variant === 'primary',
          'border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.9)] text-text-primary hover:bg-[rgb(var(--color-interactive-hover)/.95)]': variant === 'secondary',
          'text-text-muted hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary': variant === 'ghost',
          'border border-glass/10 bg-transparent text-text-primary hover:border-glass/20 hover:bg-[rgb(var(--color-interactive-surface)/.7)]': variant === 'outline',
          'border border-accent-rose/25 bg-accent-rose/[0.08] text-accent-rose hover:border-accent-rose/40 hover:bg-accent-rose/[0.14]': variant === 'danger',
          'min-h-9 rounded-lg px-3.5 py-2 text-xs': size === 'sm',
          'min-h-11 px-5 py-2.5 text-sm': size === 'md',
          'min-h-12 px-7 py-3 text-base': size === 'lg',
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
