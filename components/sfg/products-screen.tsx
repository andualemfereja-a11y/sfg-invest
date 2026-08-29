'use client'

import { TrendingUp, CalendarDays, Coins, ArrowRight } from 'lucide-react'
import type { Plan, Screen } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { PLANS } from '@/lib/plans'
import { formatETB, formatRate } from '@/lib/format'

export function ProductsScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen, planId?: string) => void
}) {
  return (
    <div className="flex flex-col gap-5 px-5 py-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Investment Plans</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Choose a plan and earn daily returns over a 180-day period.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onInvest={() => onNavigate('invest', plan.id)} />
        ))}
      </div>
    </div>
  )
}

function PlanCard({ plan, onInvest }: { plan: Plan; onInvest: () => void }) {
  const dailyOnMin = plan.minInvestment * plan.dailyProfitRate
  const totalReturn = dailyOnMin * plan.returnDays

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-secondary px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <TrendingUp className="size-5" />
          </span>
          <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
        </div>
        <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-bold text-success">
          {formatRate(plan.dailyProfitRate)}/day
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 px-5 py-4">
        <Detail
          icon={Coins}
          label="Min. Investment"
          value={formatETB(plan.minInvestment)}
        />
        <Detail
          icon={CalendarDays}
          label="Return Period"
          value={`${plan.returnDays} days`}
        />
        <Detail
          icon={TrendingUp}
          label="Daily (on min.)"
          value={formatETB(dailyOnMin)}
        />
        <Detail
          icon={Coins}
          label="Total Return (est.)"
          value={formatETB(totalReturn)}
          accent
        />
      </div>

      <div className="px-5 pb-5">
        <Button
          onClick={onInvest}
          className="h-11 w-full rounded-xl text-base font-semibold"
        >
          Invest Now
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </article>
  )
}

function Detail({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
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
