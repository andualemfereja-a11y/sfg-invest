import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function getUserFromToken(token?: string) {
  if (!token) return null
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const session = await prisma.session.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    include: { user: true },
  })
  if (!session) return null
  return { session, user: session.user }
}

export async function clearSessionByToken(token?: string) {
  if (!token) return
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  await prisma.session.deleteMany({ where: { tokenHash } })
}
