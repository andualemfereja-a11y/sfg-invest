// lib/auth.ts
import bcrypt from 'bcryptjs'
import { prisma } from './db'

const SALT_ROUNDS = 12
const SESSION_EXPIRY_DAYS = 30

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function generateSessionToken(): Promise<string> {
  // Generate a random 32-byte token and convert to hex
  return require('crypto').randomBytes(32).toString('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = await generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  })

  return token
}

export async function getSessionUser(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          baseBalance: true,
          createdAt: true,
        },
      },
    },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    // Session expired, delete it
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }

  return session.user
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  })
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  })
}
