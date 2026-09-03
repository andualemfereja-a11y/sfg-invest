'use client'

import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Wallet,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import type { Screen } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Field } from './field'
import { useApp } from '@/lib/app-context'
import {
  MIN_WITHDRAWAL,
  WITHDRAWAL_PENDING_HOURS,
} from '@/lib/plans'
import {
  formatETB,
  formatRemaining,
  formatDateTime,
} from '@/lib/format'

export function WithdrawScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void
}) {
  const { summary, withdrawals, requestWithdrawal } = useApp()

  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  function validate(): string {
    const numericAmount = Number(amount)

    if (!phone.trim()) {
      return 'Please enter your Telebirr phone number.'
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return 'Enter a valid withdrawal amount.'
    }

    if (numericAmount < MIN_WITHDRAWAL) {
      return `Minimum withdrawal is ${formatETB(MIN_WITHDRAWAL)}.`
    }

    if (numericAmount > summary.availableBalance) {
      return 'Insufficient available balance.'
    }

    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (withdrawing) return

    setError('')
    setSuccess('')

    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    const numericAmount = Number(amount)

    setWithdrawing(true)

    try {
      const res = await requestWithdrawal(phone.trim(), numericAmount)

      if (!res.ok) {
        setError(res.error ?? 'Withdrawal request failed.')
        return
      }

      setSuccess(
        `Withdrawal request for ${formatETB(
          numericAmount,
        )} submitted. It will be processed within ${WITHDRAWAL_PENDING_HOURS} hours.`,
      )

      setAmount('')
    } catch (error) {
      console.error('Withdrawal submission error:', error)

      setError(
        error instanceof Error
          ? error.message
          : 'Withdrawal request failed. Please try again.',
      )
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => onNavigate('home')}
        disabled={withdrawing}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      {/* Available balance */}
      <div className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet className="size-5" />

          <p className="text-sm font-medium opacity-80">
            Available to Withdraw
          </p>
        </div>

        <p className="mt-2 text-3xl font-extrabold tabular-nums">
          {formatETB(summary.availableBalance)}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <h2 className="text-lg font-bold text-foreground">
          Withdraw to Telebirr
        </h2>

        {/* Success message */}
        {success ? (
          <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />

            <span className="text-pretty">
              {success}
            </span>
          </div>
        ) : null}

        {/* Error message */}
        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />

            <span>{error}</span>
          </div>
        ) : null}

        {/* Telebirr phone */}
        <Field
          label="Telebirr Phone Number"
          name="telebirrPhone"
          type="tel"
          inputMode="tel"
          placeholder="09XXXXXXXX"
          value={phone}
          disabled={withdrawing}
          onChange={(e) => {
            setPhone(e.target.value)
            setError('')
            setSuccess('')
          }}
        />

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="wd-amount"
            className="text-sm font-medium text-foreground"
          >
            Amount (ETB)
          </label>

          <input
            id="wd-amount"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={`Min ${MIN_WITHDRAWAL}`}
            value={amount}
            disabled={withdrawing}
            onChange={(e) => {
              setAmount(e.target.value)
              setError('')
              setSuccess('')
            }}
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-base tabular-nums text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <p className="text-xs text-muted-foreground">
            Minimum withdrawal: {formatETB(MIN_WITHDRAWAL)}
          </p>
        </div>

        {/* Processing information */}
        <div className="flex items-start gap-2 rounded-2xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary-foreground" />

          <p className="text-pretty">
            Withdrawals are reviewed and processed within{' '}
            {WITHDRAWAL_PENDING_HOURS} hours. The amount is reserved from your
            balance immediately.
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={withdrawing}
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          {withdrawing
            ? 'Processing Withdrawal...'
            : 'Request Withdrawal'}
        </Button>
      </form>

      {/* Recent withdrawals */}
      {withdrawals.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Recent Withdrawals
          </h3>

          <div className="flex flex-col gap-3">
            {withdrawals.slice(0, 5).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <div>
                  <p className="text-base font-bold tabular-nums text-foreground">
                    {formatETB(w.amount)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(w.requestedAt)}
                  </p>
                </div>

                <div className="text-right">
                  <StatusBadge status={w.status} />

                  {w.status === 'pending' ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRemaining(w.pendingUntil)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: 'pending' | 'completed' | 'rejected'
}) {
  const map = {
    pending: 'bg-primary/20 text-primary-foreground',
    completed: 'bg-success/15 text-success',
    rejected: 'bg-destructive/10 text-destructive',
  } as const

  const label = {
    pending: 'Pending',
    completed: 'Completed',
    rejected: 'Rejected',
  } as const

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${map[status]}`}
    >
      {label[status]}
    </span>
  )
}