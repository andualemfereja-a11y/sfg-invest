// app/actions/financial.ts
'use server'

import { prisma } from '@/lib/db'
import { getSessionAction } from './auth'
import { serializeData } from '@/lib/serialize'

export interface FinancialSummary {
  ok: boolean
  user?: {
    id: string
    firstName: string
    lastName: string
    phone: string
    baseBalance: string | number
    createdAt: string
  }
  summary?: {
    availableBalance: number
    totalInvested: number
    totalEarned: number
    todayEarnings: number
    pendingWithdrawals: number
  }
  error?: string
}

export async function getFinancialSummaryAction(): Promise<FinancialSummary> {
  try {
    const sessionResult = await getSessionAction()
    if (!sessionResult.ok || !sessionResult.user) {
      return { ok: false, error: 'You must be signed in' }
    }

    const userId = sessionResult.user.id

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        baseBalance: true,
        createdAt: true,
      },
    })

    if (!user) {
      return { ok: false, error: 'User not found' }
    }

    // Get all investments
    const investments = await prisma.investment.findMany({
      where: { userId },
    })

    // Get pending withdrawals
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId, status: 'pending' },
    })

    // Calculate totals
    const activeInvestments = investments.filter((i) => i.status === 'active')
    const totalInvested = activeInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0)
    const totalEarned = investments.reduce((sum, inv) => sum + Number(inv.accumulatedEarnings), 0)
    const pendingWithdrawals = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0)

    // Calculate today's earnings
    const now = Date.now()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const todayStartMs = startOfToday.getTime()
    const MS_PER_DAY = 24 * 60 * 60 * 1000

    let todayEarnings = 0
    for (const inv of activeInvestments) {
      const dailyEarnings = Number(inv.amount) * Number(inv.profitRate)
      const startTs = typeof inv.startTimestamp === 'bigint' ? Number(inv.startTimestamp) * 1000 : inv.startTimestamp
      const endTs = typeof inv.endTimestamp === 'bigint' ? Number(inv.endTimestamp) * 1000 : inv.endTimestamp
      const todayFrom = Math.max(todayStartMs, startTs)
      const todayTo = Math.min(now, endTs)
      if (todayTo > todayFrom) {
        todayEarnings += dailyEarnings * ((todayTo - todayFrom) / MS_PER_DAY)
      }
    }

    const availableBalance = Math.max(0, Number(user.baseBalance))

    // Serialize user data
    const serializedUser = serializeData(user)

    return {
      ok: true,
      user: serializedUser,
      summary: {
        availableBalance,
        totalInvested,
        totalEarned,
        todayEarnings,
        pendingWithdrawals,
      },
    }
  } catch (error) {
    console.error('Financial summary error:', error)
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Failed to fetch financial summary' }
  }
}
