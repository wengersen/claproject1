'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-[#E8721A] text-white',
    'hover:bg-[#C45C0A] hover:-translate-y-px hover:shadow-warm-lg',
    'active:bg-[#9A4208] active:translate-y-0',
    'disabled:bg-[#D1CEC7] disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0',
    'shadow-warm',
  ].join(' '),
  secondary: [
    'bg-white text-[#4A4641] border border-[#E8E6E1]',
    'hover:bg-[#F4F3F0] hover:border-[#D1CEC7]',
    'active:bg-[#E8E6E1]',
    'disabled:bg-[#F4F3F0] disabled:text-[#A8A49C] disabled:cursor-not-allowed',
  ].join(' '),
  ghost: [
    'text-[#E8721A] bg-transparent',
    'hover:bg-[#FFF8F3]',
    'active:bg-[#FFEEDD]',
    'disabled:text-[#D1CEC7] disabled:cursor-not-allowed',
  ].join(' '),
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[13px] rounded-lg',
  md: 'px-5 py-2.5 text-[15px] rounded-xl',
  lg: 'px-6 py-3.5 text-[17px] rounded-xl font-semibold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2',
        'font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8721A] focus-visible:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        loading ? 'opacity-80 cursor-wait' : '',
        className,
      ].join(' ')}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
