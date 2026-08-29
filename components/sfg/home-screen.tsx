'use client'

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Wallet,
  PiggyBank,
  Coins,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import type { Screen } from '@/lib/types'
import { useApp } from '@/lib/app-context'
import { formatETB } from '@/lib/format'

export function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user, summary } = useApp()

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      {/* Balance hero */}
      <section className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-sm">
        <p className="text-sm font-semibold opacity-80">SFG — We Change Life</p>
        <p className="mt-4 text-sm font-medium opacity-80">Available Balance</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">
          {formatETB(summary.availableBalance)}
        </p>
        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-primary-foreground/15 px-4 py-3">
          <TrendingUp className="size-5" />
          <div>
            <p className="text-xs font-medium opacity-80">{"Today's Earnings"}</p>
            <p className="text-base font-bold tabular-nums">
              {formatETB(summary.todayEarnings)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs opacity-70">
          {user ? `Welcome back, ${user.firstName}` : ''}
        </p>
      </section>

      {/* Quick actions */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            icon={ArrowDownToLine}
            label="Deposit"
            onClick={() => onNavigate('deposit')}
          />
          <QuickAction
            icon={ArrowUpFromLine}
            label="Withdraw"
            onClick={() => onNavigate('withdraw')}
          />
          <QuickAction
            icon={TrendingUp}
            label="Invest"
            onClick={() => onNavigate('products')}
          />
        </div>
      </section>

      {/* Summary grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Wallet}
            label="Available Balance"
            value={formatETB(summary.availableBalance)}
          />
          <StatCard
            icon={Coins}
            label="Today's Earnings"
            value={formatETB(summary.todayEarnings)}
            accent="success"
          />
          <StatCard
            icon={PiggyBank}
            label="Total Invested"
            value={formatETB(summary.totalInvested)}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Earned"
            value={formatETB(summary.totalEarned)}
            accent="success"
          />
        </div>
        {summary.pendingWithdrawals > 0 ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <Clock className="size-5 text-primary-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Pending Withdrawals
              </p>
              <p className="text-base font-bold tabular-nums text-foreground">
                {formatETB(summary.pendingWithdrawals)}
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-accent"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </button>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string
  accent?: 'success'
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary-foreground">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={
            'mt-0.5 text-base font-bold tabular-nums ' +
            (accent === 'success' ? 'text-success' : 'text-foreground')
          }
        >
          {value}
        </p>
      </div>
    </div>
  )
}
