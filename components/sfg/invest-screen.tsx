'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Wallet, X } from 'lucide-react'
import type { Plan, Screen } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { PLANS, RETURN_DAYS, MS_PER_DAY } from '@/lib/plans'
import { useApp } from '@/lib/app-context'
import { formatETB, formatRate, formatDate } from '@/lib/format'

export function InvestScreen({
  selectedPlanId,
  onNavigate,
}: {
  selectedPlanId?: string
  onNavigate: (s: Screen, planId?: string) => void
}) {
  const { summary, invest } = useApp()

  const [planId, setPlanId] = useState(selectedPlanId ?? PLANS[0].id)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [investing, setInvesting] = useState(false)

  const plan = useMemo<Plan>(
    () => PLANS.find((p) => p.id === planId) ?? PLANS[0],
    [planId],
  )

  // The selected plan determines the investment amount.
  // minInvestment is being used as the fixed amount for the plan.
  const numericAmount = plan.minInvestment

  const daily = numericAmount * plan.dailyProfitRate
  const totalReturn = daily * RETURN_DAYS
  const maturity = Date.now() + RETURN_DAYS * MS_PER_DAY

  function validate(): string {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return 'This investment plan has an invalid investment amount.'
    }

    if (numericAmount > summary.availableBalance) {
      return 'Insufficient available balance. Please deposit first.'
    }

    return ''
  }

  function handleContinue() {
    const err = validate()

    if (err) {
      setError(err)
      return
    }

    setError('')
    setConfirming(true)
  }

  async function handleConfirm() {
    if (investing) return

    setInvesting(true)
    setError('')

    try {
      const res = await invest(plan, numericAmount)

      if (!res.ok) {
        setError(res.error ?? 'Investment failed.')
        setConfirming(false)
        return
      }

      setConfirming(false)
      setDone(true)
    } catch (error) {
      console.error('Investment confirmation error:', error)

      setError(
        error instanceof Error
          ? error.message
          : 'Investment failed. Please try again.',
      )

      setConfirming(false)
    } finally {
      setInvesting(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 px-5 py-16 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-11" />
        </span>

        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Investment Active
          </h2>

          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            You invested {formatETB(numericAmount)} in {plan.name}. Your daily
            earnings of {formatETB(daily)} start accruing now.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={() => onNavigate('mine')}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            View My Investments
          </Button>

          <Button
            variant="outline"
            onClick={() => onNavigate('home')}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      {/* Available balance */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary-foreground">
            <Wallet className="size-5" />
          </span>

          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Available Balance
            </p>

            <p className="text-lg font-bold tabular-nums text-foreground">
              {formatETB(summary.availableBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Plan selector */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Select Plan
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {PLANS.map((p) => {
            const active = p.id === plan.id

            return (
              <button
                key={p.id}
                type="button"
                disabled={investing}
                onClick={() => {
                  setPlanId(p.id)
                  setError('')
                }}
                className={
                  'flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors ' +
                  (active
                    ? 'border-primary bg-accent'
                    : 'border-border bg-card hover:border-primary/50') +
                  (investing
                    ? ' cursor-not-allowed opacity-60'
                    : '')
                }
              >
                <span className="text-sm font-bold text-foreground">
                  {p.name}
                </span>

                <span className="text-sm font-bold text-foreground">
                  {formatETB(p.minInvestment)}
                </span>

                <span className="text-xs font-semibold text-success">
                  {formatRate(p.dailyProfitRate)}/day
                </span>

                <span className="text-xs text-muted-foreground">
                  {p.returnDays} days
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected investment amount */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Investment Amount
            </p>

            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {formatETB(numericAmount)}
            </p>
          </div>

          <div className="rounded-xl bg-accent px-3 py-2">
            <p className="text-xs font-semibold text-primary">
              {plan.name}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          The investment amount is fixed by the selected plan.
        </p>

        {error ? (
          <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {/* Projection */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Projected Returns
        </h3>

        <div className="mt-4 flex flex-col gap-3">
          <ProjRow
            label="Investment"
            value={formatETB(numericAmount)}
          />

          <ProjRow
            label="Daily Earnings"
            value={formatETB(daily)}
            accent
          />

          <ProjRow
            label={`Total Return (${RETURN_DAYS} days)`}
            value={formatETB(totalReturn)}
            accent
          />

          <ProjRow
            label="Value at Maturity"
            value={formatETB(numericAmount + totalReturn)}
          />

          <ProjRow
            label="Maturity Date"
            value={formatDate(maturity)}
          />
        </div>
      </div>

      {/* Continue */}
      <Button
        onClick={handleContinue}
        disabled={investing}
        className="h-12 w-full rounded-xl text-base font-semibold"
      >
        Continue
      </Button>

      {/* Confirmation dialog */}
      {confirming ? (
        <ConfirmDialog
          plan={plan}
          amount={numericAmount}
          daily={daily}
          totalReturn={totalReturn}
          investing={investing}
          onCancel={() => {
            if (!investing) {
              setConfirming(false)
            }
          }}
          onConfirm={handleConfirm}
        />
      ) : null}
    </div>
  )
}

function ProjRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span
        className={
          'text-sm font-bold tabular-nums ' +
          (accent ? 'text-success' : 'text-foreground')
        }
      >
        {value}
      </span>
    </div>
  )
}

function ConfirmDialog({
  plan,
  amount,
  daily,
  totalReturn,
  investing,
  onCancel,
  onConfirm,
}: {
  plan: Plan
  amount: number
  daily: number
  totalReturn: number
  investing: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-foreground">
            Confirm Investment
          </h3>

          <button
            type="button"
            onClick={onCancel}
            disabled={investing}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-secondary p-4">
          <ProjRow
            label="Plan"
            value={plan.name}
          />

          <ProjRow
            label="Amount"
            value={formatETB(amount)}
          />

          <ProjRow
            label="Daily Earnings"
            value={formatETB(daily)}
            accent
          />

          <ProjRow
            label="Total Return"
            value={formatETB(totalReturn)}
            accent
          />

          <ProjRow
            label="Duration"
            value={`${plan.returnDays} days`}
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-pretty">
          {formatETB(amount)} will be deducted from your available balance
          and locked for {plan.returnDays} days. Earnings accrue daily.
        </p>

        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={investing}
            className="h-12 flex-1 rounded-xl text-base font-semibold"
          >
            Cancel
          </Button>

          <Button
            onClick={onConfirm}
            disabled={investing}
            className="h-12 flex-1 rounded-xl text-base font-semibold"
          >
            {investing ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}