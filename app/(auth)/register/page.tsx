'use client'

import { useState } from 'react'
import { TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, PasswordField } from '@/components/sfg/field'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface FormValues {
  firstName: string
  lastName: string
  phone: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  firstName?: string
  lastName?: string
  phone?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterPage() {
  const [values, setValues] = useState<FormValues>({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  function setValue<K extends keyof FormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    // Clear error for this field when user starts typing
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  function validateForm(): FormErrors {
    const newErrors: FormErrors = {}

    if (!values.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    } else if (values.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    if (!values.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    } else if (values.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }

    if (!values.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    if (!values.password) {
      newErrors.password = 'Password is required'
    } else if (values.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!values.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (values.password !== values.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    return newErrors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')

    // Validate form
    const formErrors = validateForm()
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      return
    }

    setLoading(true)

    try {
      const result = await register({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        password: values.password,
        confirmPassword: values.confirmPassword,
      })

      if (!result.ok) {
        setServerError(result.error ?? 'Unable to register.')
      } else {
        // Registration successful, redirect to home
        router.push('/')
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col border-x border-border bg-background px-6 pb-10 pt-14 shadow-xl">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <TrendingUp className="size-8" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">SFG</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            We Change Life
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5">
        <h2 className="text-xl font-bold text-foreground">Create your account</h2>

        {serverError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First Name"
            name="firstName"
            autoComplete="given-name"
            placeholder="John"
            value={values.firstName}
            onChange={(e) => setValue('firstName', e.target.value)}
            error={errors.firstName}
            required
          />
          <Field
            label="Last Name"
            name="lastName"
            autoComplete="family-name"
            placeholder="Doe"
            value={values.lastName}
            onChange={(e) => setValue('lastName', e.target.value)}
            error={errors.lastName}
            required
          />
        </div>

        <Field
          label="Phone Number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09XXXXXXXX"
          value={values.phone}
          onChange={(e) => setValue('phone', e.target.value)}
          error={errors.phone}
          required
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={values.password}
          onChange={(e) => setValue('password', e.target.value)}
          error={errors.password}
          required
        />

        <PasswordField
          label="Confirm Password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={values.confirmPassword}
          onChange={(e) => setValue('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          required
        />

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-12 w-full rounded-xl text-base font-semibold"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <a
            href="/login"
            className="font-semibold text-primary-foreground underline decoration-primary underline-offset-2 transition-colors hover:opacity-80"
          >
            Login
          </a>
        </p>
      </form>

      <p className="mt-auto text-center text-xs text-muted-foreground text-balance">
        Investments carry risk. Earnings are estimates based on daily rates over a
        180-day period.
      </p>
    </main>
  )
}
