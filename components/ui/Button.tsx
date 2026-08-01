import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface BaseButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

interface ButtonAsButton extends BaseButtonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  asChild?: false
  children: ReactNode
  className?: string
}

interface ButtonAsLink extends BaseButtonProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className'> {
  asChild: true
  href: string
  children: ReactNode
  className?: string
}

export type ButtonProps = ButtonAsButton | ButtonAsLink

/**
 * Button: Reusable button component with consistent variants, sizes, and states.
 *
 * Variants:
 * - primary: solid blue background (default)
 * - secondary: outlined
 * - destructive: red for dangerous actions
 * - ghost: text-only
 *
 * Sizes:
 * - sm: 32px height
 * - md: 40px height (default)
 * - lg: 48px height
 *
 * States:
 * - loading: shows spinner, disables interaction, sets aria-busy
 * - disabled: visual + functional disable
 *
 * Props:
 * - fullWidth: stretches to container width
 * - All standard button attributes (type, onClick, disabled, etc.)
 */
export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    className = '',
    children,
  } = props

  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

  const variantClasses = {
    primary:
      'bg-primary text-white hover:bg-primary-dark focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
    destructive:
      'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger disabled:opacity-50 disabled:cursor-not-allowed',
    ghost:
      'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const widthClass = fullWidth ? 'w-full' : ''
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`

  // Render as Link when asChild is true
  if (props.asChild) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    )
  }

  // Render as button
  const { disabled, variant: _v, size: _s, loading: _l, fullWidth: _fw, ...buttonProps } = props
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...buttonProps}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
