'use server'

import prisma from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { cookies } from 'next/headers'
import { serializeData } from '@/lib/serialize'

interface InvestmentResult {
  success: boolean
  investment?: any
  error?: string
}

function formatInvestment(investment: any) {
  return {
    id: investment.id,
    userId: investment.userId,
    planId: investment.planId,
    planName: investment.planName,
    amount: investment.amount?.toString() ?? '0',
    profitRate: investment.profitRate?.toString() ?? '0',
    returnDays: investment.returnDays,
    startTimestamp: investment.startTimestamp.toString(),
    endTimestamp: investment.endTimestamp.toString(),
    accumulatedEarnings:
      investment.accumulatedEarnings?.toString() ?? '0',
    creditedEarnings:
      investment.creditedEarnings?.toString() ?? '0',
    lastCalculatedTimestamp:
      investment.lastCalculatedTimestamp.toString(),
    status: investment.status,
    createdAt: investment.createdAt,
    updatedAt: investment.updatedAt,
  }
}

/**
 * Create investment
 */
export async function investAction(input: {
  planId: string
  planName: string
  amount: number
  profitRate: number
}): Promise<InvestmentResult> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('sfg_session')?.value

    if (!sessionToken) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    const session = await prisma.session.findUnique({
      where: {
        token: sessionToken,
      },
      include: {
        user: true,
      },
    })

    if (!session || session.expiresAt < new Date()) {
      return {
        success: false,
        error: 'Session expired',
      }
    }

    if (!input.planId || !input.planName) {
      return {
        success: false,
        error: 'Invalid investment plan',
      }
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return {
        success: false,
        error: 'Invalid investment amount',
      }
    }

    if (!Number.isFinite(input.profitRate) || input.profitRate < 0) {
      return {
        success: false,
        error: 'Invalid profit rate',
      }
    }

    const investmentAmount = new Decimal(input.amount)
    const profitRate = new Decimal(input.profitRate)

    const now = Math.floor(Date.now() / 1000)
    const endTimestamp = now + 180 * 24 * 60 * 60

    const investment = await prisma.$transaction(async (tx) => {
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
        throw new Error('Insufficient available balance')
      }

      return tx.investment.create({
        data: {
          userId: session.user.id,
          planId: input.planId,
          planName: input.planName,
          amount: investmentAmount,
          profitRate,
          returnDays: 180,
          startTimestamp: BigInt(now),
          endTimestamp: BigInt(endTimestamp),
          accumulatedEarnings: new Decimal(0),
          creditedEarnings: new Decimal(0),
          lastCalculatedTimestamp: BigInt(now),
          status: 'active',
        },
      })
    })

    return {
      success: true,
      investment: serializeData(formatInvestment(investment)),
    }
  } catch (error) {
    console.error('Investment error:', error)

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Investment failed',
    }
  }
}

/**
 * Get user's investments
 */
export async function getInvestmentsAction(): Promise<InvestmentResult> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('sfg_session')?.value

    if (!sessionToken) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    const session = await prisma.session.findUnique({
      where: {
        token: sessionToken,
      },
    })

    if (!session || session.expiresAt < new Date()) {
      return {
        success: false,
        error: 'Session expired',
      }
    }

    const investments = await prisma.investment.findMany({
      where: {
        userId: session.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      investment: serializeData(
        investments.map(formatInvestment)
      ),
    }
  } catch (error) {
    console.error('Get investments error:', error)

    return {
      success: false,
      error: 'Failed to load investments',
    }
  }
}

/**
 * Recalculate investment earnings
 *
 * Earnings are credited to User.baseBalance
 * once the total uncredited earnings reach 243 ETB.
 */
export async function recalculateInvestmentAction(
  investmentId: string
): Promise<InvestmentResult> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('sfg_session')?.value

    if (!sessionToken) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    const session = await prisma.session.findUnique({
      where: {
        token: sessionToken,
      },
    })

    if (!session || session.expiresAt < new Date()) {
      return {
        success: false,
        error: 'Session expired',
      }
    }

    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId: session.userId,
      },
    })

    if (!investment) {
      return {
        success: false,
        error: 'Investment not found',
      }
    }

    if (investment.status === 'completed') {
      return {
        success: true,
        investment: serializeData(formatInvestment(investment)),
      }
    }

    const now = BigInt(Math.floor(Date.now() / 1000))

    const elapsedSeconds =
      Number(now - investment.startTimestamp)

    const elapsedDays = Math.max(
      0,
      elapsedSeconds / (24 * 60 * 60)
    )

    const amountNum = Number(investment.amount)
    const profitRateNum = Number(investment.profitRate)

    let accumulatedEarnings =
      amountNum *
      (profitRateNum / 100) *
      elapsedDays

    let status = investment.status

    if (now >= investment.endTimestamp) {
      accumulatedEarnings =
        amountNum *
        (profitRateNum / 100) *
        investment.returnDays

      status = 'completed'
    }

    accumulatedEarnings = Math.max(
      0,
      accumulatedEarnings
    )

    const totalEarnings = new Decimal(
      accumulatedEarnings.toFixed(2)
    )

    const alreadyCredited =
      investment.creditedEarnings ??
      new Decimal(0)

    const creditThreshold = new Decimal(243)

    /*
     * Only credit earnings once the uncredited earnings
     * have reached 243 ETB.
     */
    const uncreditedEarnings =
      totalEarnings.minus(alreadyCredited)

    let creditAmount = new Decimal(0)

    if (uncreditedEarnings.gte(creditThreshold)) {
      creditAmount = uncreditedEarnings
    }

    const updatedInvestment =
      await prisma.$transaction(async (tx) => {
        if (creditAmount.gt(0)) {
          // Add the earnings to the user's available balance.
          await tx.user.update({
            where: {
              id: investment.userId,
            },
            data: {
              baseBalance: {
                increment: creditAmount,
              },
            },
          })

          // Mark those earnings as credited so they
          // cannot be added again on the next recalculation.
          return tx.investment.update({
            where: {
              id: investment.id,
            },
            data: {
              accumulatedEarnings: totalEarnings,
              creditedEarnings: {
                increment: creditAmount,
              },
              lastCalculatedTimestamp: now,
              status,
            },
          })
        }

        return tx.investment.update({
          where: {
            id: investment.id,
          },
          data: {
            accumulatedEarnings: totalEarnings,
            lastCalculatedTimestamp: now,
            status,
          },
        })
      })

    return {
      success: true,
      investment: serializeData(
        formatInvestment(updatedInvestment)
      ),
    }
  } catch (error) {
    console.error(
      'Recalculate investment error:',
      error
    )

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to recalculate investment',
    }
  }
}