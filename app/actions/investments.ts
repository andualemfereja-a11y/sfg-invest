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
    amount:
      inv.amount instanceof Decimal
        ? inv.amount.toString()
        : String(inv.amount),
    profitRate:
      inv.profitRate instanceof Decimal
        ? inv.profitRate.toString()
        : String(inv.profitRate),
    returnDays: inv.returnDays,
    startTimestamp:
      typeof inv.startTimestamp === 'bigint'
        ? Number(inv.startTimestamp)
        : inv.startTimestamp,
    endTimestamp:
      typeof inv.endTimestamp === 'bigint'
        ? Number(inv.endTimestamp)
        : inv.endTimestamp,
    accumulatedEarnings:
      inv.accumulatedEarnings instanceof Decimal
        ? inv.accumulatedEarnings.toString()
        : String(inv.accumulatedEarnings),
    lastCalculatedTimestamp:
      typeof inv.lastCalculatedTimestamp === 'bigint'
        ? Number(inv.lastCalculatedTimestamp)
        : inv.lastCalculatedTimestamp,
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
    console.log('💰 Starting investment...')
    console.log('📊 Input:', input)

    // Get current user from session
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('sfg_session')?.value

    if (!token) {
      console.log('❌ No session token found')
      return { ok: false, error: 'Not authenticated' }
    }

    console.log('✅ Session token found')

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || !session.user) {
      console.log('❌ User not found in session')
      return { ok: false, error: 'User not found' }
    }

    console.log('✅ User found:', session.user.id)

    // Convert string inputs to appropriate types
    const amount =
      typeof input.amount === 'string'
        ? parseFloat(input.amount)
        : input.amount

    const profitRate =
      typeof input.profitRate === 'string'
        ? parseFloat(input.profitRate)
        : input.profitRate

    console.log('💵 Amount:', amount, 'ProfitRate:', profitRate)

    if (!Number.isFinite(amount) || amount <= 0) {
      console.log('❌ Invalid investment amount:', amount)
      return { ok: false, error: 'Invalid investment amount' }
    }

    if (!Number.isFinite(profitRate) || profitRate < 0) {
      console.log('❌ Invalid profit rate:', profitRate)
      return { ok: false, error: 'Invalid profit rate' }
    }

    console.log('✅ Validation passed')

    const investmentAmount = new Decimal(amount)

    /*
     * Deduct balance and create investment in one transaction.
     *
     * This guarantees that:
     * - The user must have enough balance.
     * - The balance is deducted.
     * - The investment is created.
     *
     * If anything fails, the whole transaction is rolled back.
     */
    const investment = await prisma.$transaction(async (tx) => {
      console.log('💳 Checking and deducting user balance...')

      /*
       * Only update the user if their balance is sufficient.
       *
       * Using updateMany with gte makes the balance check and
       * deduction atomic.
       */
      const balanceUpdate = await tx.user.updateMany({
        where: {
          id: session.user.id,
          baseBalance: {
            gte: investmentAmount,
          },
        },
        data: {
          baseBalance: {
            decrement: investmentAmount,
          },
        },
      })

      if (balanceUpdate.count !== 1) {
        console.log('❌ Insufficient available balance')

        throw new Error('Insufficient available balance')
      }

      console.log('✅ Balance deducted:', amount)

      // Create investment record
      console.log('🔄 Creating investment in database...')

      const createdInvestment = await tx.investment.create({
        data: {
          userId: session.user.id,
          planId: input.planId,
          planName: input.planName,
          amount: investmentAmount,
          profitRate: new Decimal(profitRate),
          returnDays: 180,

          // Keeping your original timestamp logic
          startTimestamp: BigInt(
            Math.floor(Date.now() / 1000),
          ),

          endTimestamp:
            BigInt(Math.floor(Date.now() / 1000)) +
            BigInt(180 * 24 * 60 * 60),

          accumulatedEarnings: new Decimal(0),

          lastCalculatedTimestamp: BigInt(
            Math.floor(Date.now() / 1000),
          ),

          status: 'active',
        },
      })

      console.log(
        '✅ Investment created in DB:',
        createdInvestment.id,
      )

      return createdInvestment
    })

    // Format and serialize the investment
    console.log('🔄 Formatting investment...')

    const formattedInvestment = formatInvestment(investment)

    console.log('✅ Investment formatted')

    console.log('🔄 Serializing investment...')

    const serializedInvestment = serializeData(formattedInvestment)

    console.log('✅ Investment serialized')

    console.log('✅ Investment action successful')

    return {
      ok: true,
      investment: serializedInvestment,
    }
  } catch (error) {
    console.error('❌ Investment error:', error)

    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)

      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: false,
      error: 'Investment creation failed',
    }
  }
}

export async function getInvestmentsAction(): Promise<InvestmentResult> {
  try {
    console.log('📋 Fetching investments...')

    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('sfg_session')?.value

    if (!token) {
      console.log('❌ No session token found')

      return {
        ok: false,
        error: 'Not authenticated',
        investments: [],
      }
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || !session.user) {
      console.log('❌ User not found in session')

      return {
        ok: false,
        error: 'User not found',
        investments: [],
      }
    }

    console.log('✅ User found:', session.user.id)

    const investments = await prisma.investment.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(
      '✅ Found',
      investments.length,
      'investments',
    )

    // Format and serialize all investments
    const formattedInvestments =
      investments.map(formatInvestment)

    const serializedInvestments =
      serializeData(formattedInvestments)

    return {
      ok: true,
      investments: serializedInvestments,
    }
  } catch (error) {
    console.error('❌ Get investments error:', error)

    if (error instanceof Error) {
      return {
        ok: false,
        error: error.message,
        investments: [],
      }
    }

    return {
      ok: false,
      error: 'Failed to fetch investments',
      investments: [],
    }
  }
}

export async function recalculateInvestmentAction(
  investmentId: string,
): Promise<InvestmentResult> {
  try {
    console.log(
      '🔄 Recalculating investment:',
      investmentId,
    )

    const investment = await prisma.investment.findUnique({
      where: {
        id: investmentId,
      },
    })

    if (!investment) {
      console.log('❌ Investment not found')

      return {
        ok: false,
        error: 'Investment not found',
      }
    }

    console.log('✅ Investment found')

    if (investment.status === 'completed') {
      console.log('ℹ️ Investment already completed')

      const formattedInvestment =
        formatInvestment(investment)

      const serializedInvestment =
        serializeData(formattedInvestment)

      return {
        ok: true,
        investment: serializedInvestment,
      }
    }

    const now = BigInt(
      Math.floor(Date.now() / 1000),
    )

    const elapsedSeconds = Number(
      now - investment.startTimestamp,
    )

    const elapsedDays =
      elapsedSeconds / (24 * 60 * 60)

    console.log('⏱️ Elapsed days:', elapsedDays)

    const amountNum =
      investment.amount instanceof Decimal
        ? investment.amount.toNumber()
        : Number(investment.amount)

    const profitRateNum =
      investment.profitRate instanceof Decimal
        ? investment.profitRate.toNumber()
        : Number(investment.profitRate)

    let accumulatedEarnings =
      amountNum *
      (profitRateNum / 100) *
      elapsedDays

    let status = investment.status

    if (now >= investment.endTimestamp) {
      console.log('✅ Investment period completed')

      accumulatedEarnings =
        amountNum *
        (profitRateNum / 100) *
        investment.returnDays

      status = 'completed'
    }

    console.log(
      '💰 Accumulated earnings:',
      accumulatedEarnings,
    )

    const updated = await prisma.investment.update({
      where: {
        id: investmentId,
      },
      data: {
        accumulatedEarnings: new Decimal(
          Math.max(0, accumulatedEarnings),
        ),
        lastCalculatedTimestamp: now,
        status,
      },
    })

    console.log('✅ Investment updated')

    // Format and serialize the updated investment
    const formattedInvestment =
      formatInvestment(updated)

    const serializedInvestment =
      serializeData(formattedInvestment)

    return {
      ok: true,
      investment: serializedInvestment,
    }
  } catch (error) {
    console.error(
      '❌ Recalculate investment error:',
      error,
    )

    if (error instanceof Error) {
      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: false,
      error: 'Failed to recalculate investment',
    }
  }
}