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
    requestedAt: typeof w.requestedAt === 'bigint' ? Number(w.requestedAt) : w.requestedAt,
    pendingUntil: typeof w.pendingUntil === 'bigint' ? Number(w.pendingUntil) : w.pendingUntil,
    completedAt: w.completedAt === null ? null : (typeof w.completedAt === 'bigint' ? Number(w.completedAt) : w.completedAt),
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

    // Validate amount
    if (input.amount <= 0) {
      return { ok: false, error: 'Amount must be greater than 0' }
    }

    // Create withdrawal request
    const now = Math.floor(Date.now() / 1000)
    const pendingUntil = now + 48 * 60 * 60 // 48 hours pending period

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: session.user.id,
        amount: new Decimal(input.amount),
        method: 'telebirr',
        telebirrPhone: input.telebirrPhone,
        status: 'pending',
        requestedAt: BigInt(now),
        pendingUntil: BigInt(pendingUntil),
        completedAt: null,
      },
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
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Withdrawal request failed' }
  }
}

export async function getWithdrawalsAction(): Promise<WithdrawalResult> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('sfg_session')?.value

    if (!token) {
      return { ok: false, error: 'Not authenticated', withdrawals: [] }
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || !session.user) {
      return { ok: false, error: 'User not found', withdrawals: [] }
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: 'desc' },
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
      return { ok: false, error: error.message, withdrawals: [] }
    }
    return { ok: false, error: 'Failed to fetch withdrawals', withdrawals: [] }
  }
}

export async function cancelWithdrawalAction(withdrawalId: string): Promise<WithdrawalResult> {
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

    // Verify withdrawal belongs to user
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    })

    if (!withdrawal) {
      return { ok: false, error: 'Withdrawal not found' }
    }

    if (withdrawal.userId !== session.user.id) {
      return { ok: false, error: 'Unauthorized' }
    }

    if (withdrawal.status !== 'pending') {
      return { ok: false, error: 'Can only cancel pending withdrawals' }
    }

    const updated = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'rejected' },
    })

    const formattedWithdrawal = formatWithdrawal(updated)
    const serializedWithdrawal = serializeData(formattedWithdrawal)

    return {
      ok: true,
      withdrawal: serializedWithdrawal,
    }
  } catch (error) {
    console.error('Cancel withdrawal error:', error)
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Failed to cancel withdrawal' }
  }
}
