'use client'

import { useState } from 'react'
import { TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, PasswordField } from './field'
import { useApp } from '@/lib/app-context'

type Mode = 'login' | 'register'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')

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

      <div className="mt-10 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        <TabButton active={mode === 'login'} onClick={() => setMode('login')}>
          Login
        </TabButton>
        <TabButton active={mode === 'register'} onClick={() => setMode('register')}>
          Register
        </TabButton>
      </div>

      <div className="mt-8 flex-1">
        {mode === 'login' ? (
          <LoginForm onSwitch={() => setMode('register')} />
        ) : (
          <RegisterForm onSwitch={() => setMode('login')} />
        )}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground text-balance">
        Investments carry risk. Earnings are estimates based on daily rates over a
        180-day period.
      </p>
    </main>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'h-10 rounded-lg text-sm font-semibold transition-colors ' +
        (active
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground')
      }
    >
      {children}
    </button>
  )
}

function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { login } = useApp()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = login(phone, password)
    if (!res.ok) {
      setError(res.error ?? 'Unable to sign in.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
      {error ? <FormError message={error} /> : null}
      <Field
        label="Phone Number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="09XXXXXXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button
        type="submit"
        disabled={loading}
        className="mt-2 h-12 w-full rounded-xl text-base font-semibold"
      >
        {loading ? 'Signing in...' : 'Login'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {"Don't have an account? "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-primary-foreground underline decoration-primary underline-offset-2"
        >
          Register
        </button>
      </p>
    </form>
  )
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const { register } = useApp()
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = register(values)
    if (!res.ok) {
      setError(res.error ?? 'Unable to register.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-foreground">Create your account</h2>
      {error ? <FormError message={error} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="First Name"
          name="firstName"
          autoComplete="given-name"
          placeholder="John"
          value={values.firstName}
          onChange={(e) => set('firstName', e.target.value)}
        />
        <Field
          label="Last Name"
          name="lastName"
          autoComplete="family-name"
          placeholder="Doe"
          value={values.lastName}
          onChange={(e) => set('lastName', e.target.value)}
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
        onChange={(e) => set('phone', e.target.value)}
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        placeholder="At least 6 characters"
        value={values.password}
        onChange={(e) => set('password', e.target.value)}
      />
      <PasswordField
        label="Confirm Password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Re-enter your password"
        value={values.confirmPassword}
        onChange={(e) => set('confirmPassword', e.target.value)}
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
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-primary-foreground underline decoration-primary underline-offset-2"
        >
          Login
        </button>
      </p>
    </form>
  )
}
