import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
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
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-dark disabled:opacity-50',
        {
          'bg-accent-yellow text-dark hover:brightness-110': variant === 'primary',
          'bg-white/10 text-text-primary hover:bg-white/15': variant === 'secondary',
          'text-text-primary hover:bg-white/10': variant === 'ghost',
          'border border-glass text-text-primary hover:bg-white/5': variant === 'outline',
          'px-4 py-2 text-sm': size === 'sm',
          'px-6 py-2.5 text-sm': size === 'md',
          'px-8 py-3 text-base': size === 'lg',
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
