'use server'

import { prisma } from '@/lib/db'

export interface InvestmentResult {
  ok: boolean
  error?: string
  investment?: {
    id: string
    userId: string
    planId: string
    planName: string
    amount: number
    profitRate: number
    returnDays: number
    startTimestamp: number
    endTimestamp: number
    accumulatedEarnings: number
    lastCalculatedTimestamp: number
    status: 'active' | 'completed'
  }
  investments?: Array<{
    id: string
    userId: string
    planId: string
    planName: string
    amount: number
    profitRate: number
    returnDays: number
    startTimestamp: number
    endTimestamp: number
    accumulatedEarnings: number
    lastCalculatedTimestamp: number
    status: 'active' | 'completed'
  }>
}

export async function investAction(input: {
  planId: string
  planName: string
  amount: number
  profitRate: number
}): Promise<InvestmentResult> {
  try {
    // Get current user from session
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('sfg_session')?.value

    if (!token) {
      return { ok: false, error: 'Not authenticated' }
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || !session.user) {
      return { ok: false, error: 'User not found' }
    }

    // Create investment record
    const investment = await prisma.investment.create({
      data: {
        userId: session.user.id,
        planId: input.planId,
        planName: input.planName,
        amount: input.amount,
        profitRate: input.profitRate,
        returnDays: 180,
        startTimestamp: Math.floor(Date.now() / 1000),
        endTimestamp: Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60,
        accumulatedEarnings: 0,
        lastCalculatedTimestamp: Math.floor(Date.now() / 1000),
        status: 'active',
      },
    })

    return {
      ok: true,
      investment: {
        id: investment.id,
        userId: investment.userId,
        planId: investment.planId,
        planName: investment.planName,
        amount: investment.amount,
        profitRate: investment.profitRate,
        returnDays: investment.returnDays,
        startTimestamp: investment.startTimestamp,
        endTimestamp: investment.endTimestamp,
        accumulatedEarnings: investment.accumulatedEarnings,
        lastCalculatedTimestamp: investment.lastCalculatedTimestamp,
        status: investment.status as 'active' | 'completed',
      },
    }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Investment creation failed' }
  }
}

export async function getInvestmentsAction(): Promise<InvestmentResult> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('sfg_session')?.value

    if (!token) {
      return { ok: false, error: 'Not authenticated', investments: [] }
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || !session.user) {
      return { ok: false, error: 'User not found', investments: [] }
    }

    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
    })

    return {
      ok: true,
      investments: investments.map((inv) => ({
        id: inv.id,
        userId: inv.userId,
        planId: inv.planId,
        planName: inv.planName,
        amount: inv.amount,
        profitRate: inv.profitRate,
        returnDays: inv.returnDays,
        startTimestamp: inv.startTimestamp,
        endTimestamp: inv.endTimestamp,
        accumulatedEarnings: inv.accumulatedEarnings,
        lastCalculatedTimestamp: inv.lastCalculatedTimestamp,
        status: inv.status as 'active' | 'completed',
      })),
    }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message, investments: [] }
    }
    return { ok: false, error: 'Failed to fetch investments', investments: [] }
  }
}

export async function recalculateInvestmentAction(investmentId: string): Promise<InvestmentResult> {
  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    })

    if (!investment) {
      return { ok: false, error: 'Investment not found' }
    }

    if (investment.status === 'completed') {
      return { ok: true, investment: investment as any }
    }

    const now = Math.floor(Date.now() / 1000)
    const elapsedSeconds = now - investment.startTimestamp
    const elapsedDays = elapsedSeconds / (24 * 60 * 60)

    let accumulatedEarnings = investment.amount * (investment.profitRate / 100) * elapsedDays
    let status = investment.status

    if (now >= investment.endTimestamp) {
      accumulatedEarnings = investment.amount * (investment.profitRate / 100) * investment.returnDays
      status = 'completed'
    }

    const updated = await prisma.investment.update({
      where: { id: investmentId },
      data: {
        accumulatedEarnings: Math.max(0, accumulatedEarnings),
        lastCalculatedTimestamp: now,
        status,
      },
    })

    return {
      ok: true,
      investment: {
        id: updated.id,
        userId: updated.userId,
        planId: updated.planId,
        planName: updated.planName,
        amount: updated.amount,
        profitRate: updated.profitRate,
        returnDays: updated.returnDays,
        startTimestamp: updated.startTimestamp,
        endTimestamp: updated.endTimestamp,
        accumulatedEarnings: updated.accumulatedEarnings,
        lastCalculatedTimestamp: updated.lastCalculatedTimestamp,
        status: updated.status as 'active' | 'completed',
      },
    }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Failed to recalculate investment' }
  }
}
