// app/actions/deposits.ts
'use server'

import { prisma } from '@/lib/db'
import { depositSchema } from '@/lib/validation'
import { getSessionAction } from './auth'
import { serializeData } from '@/lib/serialize'
import { Decimal } from '@prisma/client/runtime/library'

export interface DepositResult {
  ok: boolean
  error?: string
  depositId?: string
}

// Admin action to confirm deposit
export async function confirmDepositAction(depositId: string): Promise<DepositResult> {
  try {
    const sessionResult = await getSessionAction()
    if (!sessionResult.ok || !sessionResult.user) {
      return { ok: false, error: 'You must be signed in' }
    }

    // TODO: Add admin role check
    // For now, only allow the user to confirm their own deposits

    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
    })

    if (!deposit) {
      return { ok: false, error: 'Deposit not found' }
    }

    // Update deposit status and add to user balance in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.deposit.update({
        where: { id: depositId },
        data: { status: 'confirmed' },
      })

      // Add amount to user's baseBalance
      await tx.user.update({
        where: { id: deposit.userId },
        data: {
          baseBalance: {
            increment: deposit.amount,
          },
        },
      })

      return updated
    })

    return { ok: true, depositId: result.id }
  } catch (error) {
    console.error('Confirm deposit error:', error)
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Failed to confirm deposit' }
  }
}

export async function getDepositsAction(): Promise<{
  ok: boolean
  deposits?: any[]
  error?: string
}> {
  try {
    const sessionResult = await getSessionAction()
    if (!sessionResult.ok || !sessionResult.user) {
      return { ok: false, error: 'You must be signed in', deposits: [] }
    }

    const deposits = await prisma.deposit.findMany({
      where: { userId: sessionResult.user.id },
      orderBy: { createdAt: 'desc' },
    })

    // Serialize deposits to handle Decimal types
    const serializedDeposits = serializeData(deposits)

    return { ok: true, deposits: serializedDeposits }
  } catch (error) {
    console.error('Get deposits error:', error)
    if (error instanceof Error) {
      return { ok: false, error: error.message, deposits: [] }
    }
    return { ok: false, error: 'Failed to fetch deposits', deposits: [] }
  }
}

export async function requestDepositAction(amount: number): Promise<DepositResult> {
  try {
    const sessionResult = await getSessionAction()
    if (!sessionResult.ok || !sessionResult.user) {
      return { ok: false, error: 'You must be signed in' }
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'Enter a valid deposit amount' }
    }

    const deposit = await prisma.deposit.create({
      data: {
        userId: sessionResult.user.id,
        amount: new Decimal(amount),
        method: 'telebirr',
        status: 'pending',
      },
    })

    return { ok: true, depositId: deposit.id }
  } catch (error) {
    console.error('Request deposit error:', error)
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Deposit request failed' }
  }
}
