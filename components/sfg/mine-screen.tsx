'use client'

import {
  LogOut,
  TrendingUp,
  ArrowUpFromLine,
  ArrowDownToLine,
  User as UserIcon,
} from 'lucide-react'
import type { Screen } from '@/lib/types'
import type { InvestmentComputed } from '@/lib/earnings'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/app-context'
import {
  formatETB,
  formatRate,
  formatDate,
  displayPhone,
  formatDateTime,
} from '@/lib/format'

export function MineScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user, investments, withdrawals, summary, logout } = useApp()
  if (!user) return null

  const active = investments.filter((i) => i.status === 'active')
  const completed = investments.filter((i) => i.status === 'completed')

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      {/* Profile */}
      <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <UserIcon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-foreground">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{displayPhone(user.phone)}</p>
        </div>
      </section>

      {/* Totals */}
      <section className="grid grid-cols-2 gap-3">
        <MiniStat label="Total Invested" value={formatETB(summary.totalInvested)} />
        <MiniStat
          label="Total Earned"
          value={formatETB(summary.totalEarned)}
          accent
        />
      </section>

      {/* Active investments */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Active Investments
        </h2>
        {active.length === 0 ? (
          <EmptyState
            text="You have no active investments yet."
            actionLabel="Browse Plans"
            onAction={() => onNavigate('products')}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {active.map((inv) => (
              <InvestmentCard key={inv.id} inv={inv} />
            ))}
          </div>
        )}
      </section>

      {/* Completed investments */}
      {completed.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Completed Investments
          </h2>
          <div className="flex flex-col gap-4">
            {completed.map((inv) => (
              <InvestmentCard key={inv.id} inv={inv} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Transactions */}
      {withdrawals.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Withdrawal History
          </h2>
          <div className="flex flex-col gap-3">
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary-foreground">
                  <ArrowUpFromLine className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {formatETB(w.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(w.requestedAt)}
                  </p>
                </div>
                <span
                  className={
                    'rounded-full px-3 py-1 text-xs font-bold ' +
                    (w.status === 'completed'
                      ? 'bg-success/15 text-success'
                      : w.status === 'pending'
                        ? 'bg-primary/20 text-primary-foreground'
                        : 'bg-destructive/10 text-destructive')
                  }
                >
                  {w.status[0].toUpperCase() + w.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => onNavigate('deposit')}
          className="h-12 rounded-xl text-base font-semibold"
        >
          <ArrowDownToLine className="size-4" />
          Deposit
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate('withdraw')}
          className="h-12 rounded-xl text-base font-semibold"
        >
          <ArrowUpFromLine className="size-4" />
          Withdraw
        </Button>
      </section>

      <Button
        variant="destructive"
        onClick={logout}
        className="h-12 w-full rounded-xl text-base font-semibold"
      >
        <LogOut className="size-4" />
        Log Out
      </Button>
    </div>
  )
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          'mt-1 text-lg font-bold tabular-nums ' +
          (accent ? 'text-success' : 'text-foreground')
        }
      >
        {value}
      </p>
    </div>
  )
}

function InvestmentCard({ inv }: { inv: InvestmentComputed }) {
  const pct = Math.round(inv.progress * 100)
  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <p className="text-base font-bold text-foreground">{inv.planName}</p>
            <p className="text-xs text-muted-foreground">
              {formatRate(inv.profitRate)}/day · {formatETB(inv.amount)}
            </p>
          </div>
        </div>
        <span
          className={
            'rounded-full px-3 py-1 text-xs font-bold ' +
            (inv.status === 'active'
              ? 'bg-success/15 text-success'
              : 'bg-secondary text-muted-foreground')
          }
        >
          {inv.status === 'active' ? 'Active' : 'Completed'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Earnings Accrued</p>
          <p className="text-lg font-bold tabular-nums text-success">
            {formatETB(inv.accumulatedEarnings)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Daily Earnings</p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {formatETB(inv.dailyEarnings)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Day {inv.daysElapsed} of {inv.returnDays}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {inv.status === 'active'
            ? `Matures ${formatDate(inv.endTimestamp)} · ${inv.daysRemaining} days left`
            : `Matured ${formatDate(inv.endTimestamp)}`}
        </p>
      </div>
    </article>
  )
}

function EmptyState({
  text,
  actionLabel,
  onAction,
}: {
  text: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground text-pretty">{text}</p>
      <Button onClick={onAction} className="h-10 rounded-lg px-4 font-semibold">
        {actionLabel}
      </Button>
    </div>
  )
}
