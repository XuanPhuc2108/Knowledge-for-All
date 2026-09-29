import clsx from 'clsx'
import { motion } from 'framer-motion'
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
  'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold text-dark shadow-lg transition-shadow',
  'bg-gradient-to-br from-accent-yellow via-accent-rose to-accent-purple',
  'hover:shadow-accent-yellow/25 disabled:cursor-not-allowed disabled:opacity-50',
)

const gradientStyle = {
  background: 'linear-gradient(123deg,#FBBF24 0%,#FB7185 32%,#8B5CF6 65%,#2DD4BF 100%)',
}

function ButtonContent({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden="true"
      />
      {icon}
      <span className="relative z-10">{children}</span>
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
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className={clsx('inline-flex', className)}>
        <Link to={href} className={clsx(gradientClasses, 'w-full')} style={gradientStyle}>
          <ButtonContent icon={icon}>{children}</ButtonContent>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={clsx(gradientClasses, className)}
      style={gradientStyle}
    >
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </motion.button>
  )
}
