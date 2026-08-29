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
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  const plan = useMemo<Plan>(
    () => PLANS.find((p) => p.id === planId) ?? PLANS[0],
    [planId],
  )
  const numericAmount = Number(amount)
  const valid = Number.isFinite(numericAmount) && numericAmount > 0

  const daily = valid ? numericAmount * plan.dailyProfitRate : 0
  const totalReturn = daily * RETURN_DAYS
  const maturity = Date.now() + RETURN_DAYS * MS_PER_DAY

  function validate(): string {
    if (!valid) return 'Enter a valid investment amount.'
    if (numericAmount < plan.minInvestment)
      return `Minimum investment for ${plan.name} is ${formatETB(plan.minInvestment)}.`
    if (numericAmount > summary.availableBalance)
      return 'Insufficient available balance. Please deposit first.'
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

  function handleConfirm() {
    const res = invest(plan, numericAmount)
    if (!res.ok) {
      setError(res.error ?? 'Investment failed.')
      setConfirming(false)
      return
    }
    setConfirming(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 px-5 py-16 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-11" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Investment Active</h2>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            You invested {formatETB(numericAmount)} in {plan.name}. Your daily earnings
            of {formatETB(daily)} start accruing now.
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
            <p className="text-xs font-medium text-muted-foreground">Available Balance</p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {formatETB(summary.availableBalance)}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-lg px-3"
          onClick={() => setAmount(String(Math.floor(summary.availableBalance)))}
        >
          Use Max
        </Button>
      </div>

      {/* Plan selector */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Select Plan</h2>
        <div className="grid grid-cols-2 gap-3">
          {PLANS.map((p) => {
            const active = p.id === plan.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className={
                  'flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors ' +
                  (active
                    ? 'border-primary bg-accent'
                    : 'border-border bg-card hover:border-primary/50')
                }
              >
                <span className="text-sm font-bold text-foreground">{p.name}</span>
                <span className="text-xs font-semibold text-success">
                  {formatRate(p.dailyProfitRate)}/day
                </span>
                <span className="text-xs text-muted-foreground">
                  Min {formatETB(p.minInvestment)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invest-amount" className="text-sm font-medium text-foreground">
          Investment Amount (ETB)
        </label>
        <input
          id="invest-amount"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={`Min ${plan.minInvestment}`}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setError('')
          }}
          className="h-12 w-full rounded-xl border border-border bg-card px-4 text-base tabular-nums text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
        />
        {error ? (
          <div className="mt-1 flex items-start gap-2 text-sm text-destructive">
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
          <ProjRow label="Daily Earnings" value={formatETB(daily)} accent />
          <ProjRow
            label={`Total Return (${RETURN_DAYS} days)`}
            value={formatETB(totalReturn)}
            accent
          />
          <ProjRow
            label="Value at Maturity"
            value={formatETB(numericAmount > 0 ? numericAmount + totalReturn : 0)}
          />
          <ProjRow label="Maturity Date" value={formatDate(maturity)} />
        </div>
      </div>

      <Button
        onClick={handleContinue}
        className="h-12 w-full rounded-xl text-base font-semibold"
      >
        Continue
      </Button>

      {confirming ? (
        <ConfirmDialog
          plan={plan}
          amount={numericAmount}
          daily={daily}
          totalReturn={totalReturn}
          onCancel={() => setConfirming(false)}
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
      <span className="text-sm text-muted-foreground">{label}</span>
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
  onCancel,
  onConfirm,
}: {
  plan: Plan
  amount: number
  daily: number
  totalReturn: number
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-foreground">Confirm Investment</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-secondary p-4">
          <ProjRow label="Plan" value={plan.name} />
          <ProjRow label="Amount" value={formatETB(amount)} />
          <ProjRow label="Daily Earnings" value={formatETB(daily)} accent />
          <ProjRow label="Total Return" value={formatETB(totalReturn)} accent />
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-pretty">
          {formatETB(amount)} will be deducted from your available balance and locked
          for {plan.returnDays} days. Earnings accrue daily.
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-12 flex-1 rounded-xl text-base font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="h-12 flex-1 rounded-xl text-base font-semibold"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}
