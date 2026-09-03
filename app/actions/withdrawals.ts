'use server'

import { prisma } from '@/lib/db'
import { serializeData } from '@/lib/serialize'
import { Decimal } from '@prisma/client/runtime/library'

export interface WithdrawalResult {
  ok: boolean
  error?: string
  withdrawal?: {
    id: string
    userId: string
    amount: string | number
    method: string
    telebirrPhone: string
    status: 'pending' | 'completed' | 'rejected'
    requestedAt: number | string
    pendingUntil: number | string
    completedAt: number | string | null
  }
  withdrawals?: Array<{
    id: string
    userId: string
    amount: string | number
    method: string
    telebirrPhone: string
    status: 'pending' | 'completed' | 'rejected'
    requestedAt: number | string
    pendingUntil: number | string
    completedAt: number | string | null
  }>
}

function formatWithdrawal(w: any) {
  return {
    id: w.id,
    userId: w.userId,
    amount: w.amount instanceof Decimal ? w.amount.toString() : w.amount,
    method: w.method,
    telebirrPhone: w.telebirrPhone,
    status: w.status as 'pending' | 'completed' | 'rejected',
    requestedAt:
      typeof w.requestedAt === 'bigint'
        ? Number(w.requestedAt)
        : w.requestedAt,
    pendingUntil:
      typeof w.pendingUntil === 'bigint'
        ? Number(w.pendingUntil)
        : w.pendingUntil,
    completedAt:
      w.completedAt === null
        ? null
        : typeof w.completedAt === 'bigint'
          ? Number(w.completedAt)
          : w.completedAt,
  }
}

export async function requestWithdrawalAction(input: {
  telebirrPhone: string
  amount: number
}): Promise<WithdrawalResult> {
  try {
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

    // Validate phone number
    const telebirrPhone = input.telebirrPhone.trim()

    if (!telebirrPhone) {
      return {
        ok: false,
        error: 'Telebirr phone number is required',
      }
    }

    // Validate amount
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return {
        ok: false,
        error: 'Amount must be greater than 0',
      }
    }

    // Convert to Decimal for accurate money calculations
    const amount = new Decimal(input.amount)

    // Create timestamps in milliseconds.
    // This matches the BigInt timestamp comments in schema.prisma.
    const now = Date.now()
    const pendingUntil = now + 48 * 60 * 60 * 1000

    /*
     * IMPORTANT:
     *
     * The balance deduction and withdrawal creation happen
     * inside ONE transaction.
     *
     * This prevents:
     * - withdrawal created but balance not deducted
     * - balance deducted but withdrawal not created
     * - two simultaneous withdrawals spending the same balance
     */
    const withdrawal = await prisma.$transaction(async (tx) => {
      // Lock/check the user's current balance through an atomic update.
      //
      // The update only succeeds when baseBalance >= amount.
      // This is safer than simply reading the balance first because
      // two withdrawal requests could otherwise race each other.
      const balanceUpdate = await tx.user.updateMany({
        where: {
          id: session.user.id,
          baseBalance: {
            gte: amount,
          },
        },
        data: {
          baseBalance: {
            decrement: amount,
          },
        },
      })

      if (balanceUpdate.count !== 1) {
        throw new Error('Insufficient available balance')
      }

      // Only create the withdrawal after the balance has been
      // successfully reserved/deducted.
      const createdWithdrawal = await tx.withdrawal.create({
        data: {
          userId: session.user.id,
          amount,
          method: 'telebirr',
          telebirrPhone,
          status: 'pending',
          requestedAt: BigInt(now),
          pendingUntil: BigInt(pendingUntil),
          completedAt: null,
        },
      })

      return createdWithdrawal
    })

    const formattedWithdrawal = formatWithdrawal(withdrawal)
    const serializedWithdrawal = serializeData(formattedWithdrawal)

    return {
      ok: true,
      withdrawal: serializedWithdrawal,
    }
  } catch (error) {
    console.error('Withdrawal request error:', error)

    if (error instanceof Error) {
      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: false,
      error: 'Withdrawal request failed',
    }
  }
}

export async function getWithdrawalsAction(): Promise<WithdrawalResult> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('sfg_session')?.value

    if (!token) {
      return {
        ok: false,
        error: 'Not authenticated',
        withdrawals: [],
      }
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || !session.user) {
      return {
        ok: false,
        error: 'User not found',
        withdrawals: [],
      }
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    })

    const formattedWithdrawals = withdrawals.map(formatWithdrawal)
    const serializedWithdrawals = serializeData(formattedWithdrawals)

    return {
      ok: true,
      withdrawals: serializedWithdrawals,
    }
  } catch (error) {
    console.error('Get withdrawals error:', error)

    if (error instanceof Error) {
      return {
        ok: false,
        error: error.message,
        withdrawals: [],
      }
    }

    return {
      ok: false,
      error: 'Failed to fetch withdrawals',
      withdrawals: [],
    }
  }
}

export async function cancelWithdrawalAction(
  withdrawalId: string,
): Promise<WithdrawalResult> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('sfg_session')?.value

    if (!token) {
      return {
        ok: false,
        error: 'Not authenticated',
      }
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || !session.user) {
      return {
        ok: false,
        error: 'User not found',
      }
    }

    /*
     * Cancel + refund must also happen atomically.
     */
    const updatedWithdrawal = await prisma.$transaction(async (tx) => {
      // Verify withdrawal belongs to this user.
      const withdrawal = await tx.withdrawal.findUnique({
        where: {
          id: withdrawalId,
        },
      })

      if (!withdrawal) {
        throw new Error('Withdrawal not found')
      }

      if (withdrawal.userId !== session.user.id) {
        throw new Error('Unauthorized')
      }

      if (withdrawal.status !== 'pending') {
        throw new Error('Can only cancel pending withdrawals')
      }

      // Mark withdrawal as rejected/cancelled.
      const updated = await tx.withdrawal.update({
        where: {
          id: withdrawalId,
        },
        data: {
          status: 'rejected',
        },
      })

      // Return the reserved money to the user's balance.
      await tx.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          baseBalance: {
            increment: withdrawal.amount,
          },
        },
      })

      return updated
    })

    const formattedWithdrawal = formatWithdrawal(updatedWithdrawal)
    const serializedWithdrawal = serializeData(formattedWithdrawal)

    return {
      ok: true,
      withdrawal: serializedWithdrawal,
    }
  } catch (error) {
    console.error('Cancel withdrawal error:', error)

    if (error instanceof Error) {
      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: false,
      error: 'Failed to cancel withdrawal',
    }
  }
}