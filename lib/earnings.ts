import type { Investment } from './types'
import { MS_PER_DAY } from './plans'

export interface InvestmentComputed extends Investment {
  dailyEarnings: number
  maxEarnings: number
  todayEarnings: number
  daysElapsed: number
  daysRemaining: number
  progress: number // 0..1
}

/**
 * Idempotently recompute an investment's accumulated earnings from timestamps.
 *
 * Earnings are ALWAYS derived from elapsed time between startTimestamp and now
 * (capped at endTimestamp), never incremented. This guarantees no double
 * counting across refreshes, re-renders, logout/login, or repeated effects.
 */
export function recalcInvestment(inv: Investment, now = Date.now()): Investment {
  const dailyEarnings = inv.amount * inv.profitRate
  const maxEarnings = dailyEarnings * inv.returnDays
  const effectiveNow = Math.min(now, inv.endTimestamp)
  const elapsedDays = Math.max(0, (effectiveNow - inv.startTimestamp) / MS_PER_DAY)
  const accumulated = Math.min(maxEarnings, dailyEarnings * elapsedDays)
  const status: Investment['status'] = now >= inv.endTimestamp ? 'completed' : 'active'

  return {
    ...inv,
    accumulatedEarnings: accumulated,
    lastCalculatedTimestamp: now,
    status,
  }
}

/** Derived, display-friendly investment values. */
export function computeInvestment(inv: Investment, now = Date.now()): InvestmentComputed {
  const recalced = recalcInvestment(inv, now)
  const dailyEarnings = recalced.amount * recalced.profitRate
  const maxEarnings = dailyEarnings * recalced.returnDays

  const effectiveNow = Math.min(now, recalced.endTimestamp)
  const daysElapsedRaw = (effectiveNow - recalced.startTimestamp) / MS_PER_DAY
  const daysElapsed = Math.min(recalced.returnDays, Math.max(0, Math.floor(daysElapsedRaw)))
  const daysRemaining = Math.max(0, recalced.returnDays - daysElapsed)
  const progress = Math.min(1, Math.max(0, daysElapsedRaw / recalced.returnDays))

  // Earnings accrued since local midnight today.
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const todayStartMs = startOfToday.getTime()
  const todayFrom = Math.max(todayStartMs, recalced.startTimestamp)
  const todayTo = Math.min(now, recalced.endTimestamp)
  const todayEarnings =
    todayTo > todayFrom ? dailyEarnings * ((todayTo - todayFrom) / MS_PER_DAY) : 0

  return {
    ...recalced,
    dailyEarnings,
    maxEarnings,
    todayEarnings,
    daysElapsed,
    daysRemaining,
    progress,
  }
}
