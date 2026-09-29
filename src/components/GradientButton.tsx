import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface GradientButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
  icon?: ReactNode
  disabled?: boolean
  href?: string
}

const gradientClasses = clsx(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-yellow px-5 py-2.5 text-sm font-bold tracking-[-0.01em] text-[#242117] shadow-[0_5px_18px_rgb(251_191_36_/_0.12)] transition-[background-color,transform,box-shadow] duration-200',
  'hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[0_8px_24px_rgb(251_191_36_/_0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-dark',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

function ButtonContent({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <>
      {icon}
      <span>{children}</span>
    </>
  )
}

export function GradientButton({
  children,
  onClick,
  type = 'button',
  className,
  icon,
  disabled,
  href,
}: GradientButtonProps) {
  if (href && !disabled) {
    return (
      <Link to={href} className={clsx(gradientClasses, 'w-full', className)}>
        <ButtonContent icon={icon}>{children}</ButtonContent>
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(gradientClasses, className)}
    >
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </button>
  )
}
