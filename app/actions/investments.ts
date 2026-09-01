'use server'

import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { serializeData } from '@/lib/serialize'

export interface InvestmentResult {
  ok: boolean
  error?: string
  investment?: {
    id: string
    userId: string
    planId: string
    planName: string
    amount: string | number
    profitRate: string | number
    returnDays: number
    startTimestamp: number | string
    endTimestamp: number | string
    accumulatedEarnings: string | number
    lastCalculatedTimestamp: number | string
    status: 'active' | 'completed'
  }
  investments?: Array<{
    id: string
    userId: string
    planId: string
    planName: string
    amount: string | number
    profitRate: string | number
    returnDays: number
    startTimestamp: number | string
    endTimestamp: number | string
    accumulatedEarnings: string | number
    lastCalculatedTimestamp: number | string
    status: 'active' | 'completed'
  }>
}

function formatInvestment(inv: any) {
  return {
    id: inv.id,
    userId: inv.userId,
    planId: inv.planId,
    planName: inv.planName,
    amount: inv.amount instanceof Decimal ? inv.amount.toString() : inv.amount,
    profitRate: inv.profitRate instanceof Decimal ? inv.profitRate.toString() : inv.profitRate,
    returnDays: inv.returnDays,
    startTimestamp: typeof inv.startTimestamp === 'bigint' ? Number(inv.startTimestamp) : inv.startTimestamp,
    endTimestamp: typeof inv.endTimestamp === 'bigint' ? Number(inv.endTimestamp) : inv.endTimestamp,
    accumulatedEarnings: inv.accumulatedEarnings instanceof Decimal ? inv.accumulatedEarnings.toString() : inv.accumulatedEarnings,
    lastCalculatedTimestamp: typeof inv.lastCalculatedTimestamp === 'bigint' ? Number(inv.lastCalculatedTimestamp) : inv.lastCalculatedTimestamp,
    status: inv.status as 'active' | 'completed',
  }
}

export async function investAction(input: {
  planId: string
  planName: string
  amount: number | string
  profitRate: number | string
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

    // Convert string inputs to appropriate types
    const amount = typeof input.amount === 'string' ? parseFloat(input.amount) : input.amount
    const profitRate = typeof input.profitRate === 'string' ? parseFloat(input.profitRate) : input.profitRate

    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'Invalid investment amount' }
    }

    if (!Number.isFinite(profitRate) || profitRate < 0) {
      return { ok: false, error: 'Invalid profit rate' }
    }

    // Create investment record
    const investment = await prisma.investment.create({
      data: {
        userId: session.user.id,
        planId: input.planId,
        planName: input.planName,
        amount: new Decimal(amount),
        profitRate: new Decimal(profitRate),
        returnDays: 180,
        startTimestamp: BigInt(Math.floor(Date.now() / 1000)),
        endTimestamp: BigInt(Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60),
        accumulatedEarnings: new Decimal(0),
        lastCalculatedTimestamp: BigInt(Math.floor(Date.now() / 1000)),
        status: 'active',
      },
    })

    // Format and serialize the investment
    const formattedInvestment = formatInvestment(investment)
    const serializedInvestment = serializeData(formattedInvestment)

    return {
      ok: true,
      investment: serializedInvestment,
    }
  } catch (error) {
    console.error('Investment error:', error)
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
      orderBy: { createdAt: 'desc' },
    })

    // Format and serialize all investments
    const formattedInvestments = investments.map(formatInvestment)
    const serializedInvestments = serializeData(formattedInvestments)

    return {
      ok: true,
      investments: serializedInvestments,
    }
  } catch (error) {
    console.error('Get investments error:', error)
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
      const formattedInvestment = formatInvestment(investment)
      const serializedInvestment = serializeData(formattedInvestment)
      return { ok: true, investment: serializedInvestment }
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const elapsedSeconds = Number(now - investment.startTimestamp)
    const elapsedDays = elapsedSeconds / (24 * 60 * 60)

    const amountNum = investment.amount instanceof Decimal ? investment.amount.toNumber() : Number(investment.amount)
    const profitRateNum = investment.profitRate instanceof Decimal ? investment.profitRate.toNumber() : Number(investment.profitRate)

    let accumulatedEarnings = amountNum * (profitRateNum / 100) * elapsedDays
    let status = investment.status

    if (now >= investment.endTimestamp) {
      accumulatedEarnings = amountNum * (profitRateNum / 100) * investment.returnDays
      status = 'completed'
    }

    const updated = await prisma.investment.update({
      where: { id: investmentId },
      data: {
        accumulatedEarnings: new Decimal(Math.max(0, accumulatedEarnings)),
        lastCalculatedTimestamp: now,
        status,
      },
    })

    // Format and serialize the updated investment
    const formattedInvestment = formatInvestment(updated)
    const serializedInvestment = serializeData(formattedInvestment)

    return {
      ok: true,
      investment: serializedInvestment,
    }
  } catch (error) {
    console.error('Recalculate investment error:', error)
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Failed to recalculate investment' }
  }
}
