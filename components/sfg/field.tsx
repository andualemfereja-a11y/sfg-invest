'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const baseInput =
  'w-full h-12 rounded-xl border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/20 disabled:opacity-50'

export function Field({ label, error, className, id, ...props }: FieldProps) {
  const inputId = id ?? props.name
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(baseInput, error && 'border-destructive focus:border-destructive focus:ring-destructive/20', className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function PasswordField({ label, error, className, id, ...props }: FieldProps) {
  const [show, setShow] = useState(false)
  const inputId = id ?? props.name
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          className={cn(
            baseInput,
            'pr-12',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
            className,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
