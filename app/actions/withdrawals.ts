'use server'

import { prisma } from '@/lib/db'

export interface WithdrawalResult {
  ok: boolean
  error?: string
  withdrawal?: {
    id: string
    userId: string
    amount: number
    method: string
    telebirrPhone: string
    status: 'pending' | 'completed' | 'rejected'
    requestedAt: number
    pendingUntil: number
    completedAt: number | null
  }
  withdrawals?: Array<{
    id: string
    userId: string
    amount: number
    method: string
    telebirrPhone: string
    status: 'pending' | 'completed' | 'rejected'
    requestedAt: number
    pendingUntil: number
    completedAt: number | null
  }>
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
        amount: input.amount,
        method: 'telebirr',
        telebirrPhone: input.telebirrPhone,
        status: 'pending',
        requestedAt: now,
        pendingUntil,
        completedAt: null,
      },
    })

    return {
      ok: true,
      withdrawal: {
        id: withdrawal.id,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        method: withdrawal.method,
        telebirrPhone: withdrawal.telebirrPhone,
        status: withdrawal.status as 'pending' | 'completed' | 'rejected',
        requestedAt: withdrawal.requestedAt,
        pendingUntil: withdrawal.pendingUntil,
        completedAt: withdrawal.completedAt,
      },
    }
  } catch (error) {
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

    return {
      ok: true,
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        userId: w.userId,
        amount: w.amount,
        method: w.method,
        telebirrPhone: w.telebirrPhone,
        status: w.status as 'pending' | 'completed' | 'rejected',
        requestedAt: w.requestedAt,
        pendingUntil: w.pendingUntil,
        completedAt: w.completedAt,
      })),
    }
  } catch (error) {
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

    return {
      ok: true,
      withdrawal: {
        id: updated.id,
        userId: updated.userId,
        amount: updated.amount,
        method: updated.method,
        telebirrPhone: updated.telebirrPhone,
        status: updated.status as 'pending' | 'completed' | 'rejected',
        requestedAt: updated.requestedAt,
        pendingUntil: updated.pendingUntil,
        completedAt: updated.completedAt,
      },
    }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Failed to cancel withdrawal' }
  }
}
