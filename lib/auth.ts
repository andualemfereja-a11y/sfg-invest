// lib/auth.ts
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { v4 as uuidv4 } from 'uuid'

const SALT_ROUNDS = 12
const SESSION_EXPIRY_DAYS = 30

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function generateSessionToken(): Promise<string> {
  // Generate a more reliable session token
  return uuidv4()
}

export async function createSession(userId: string): Promise<string> {
  try {
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
  } catch (error) {
    console.error('Failed to create session:', error)
    throw new Error('Failed to create session')
  }
}

export async function getSessionUser(token: string) {
  try {
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
  } catch (error) {
    console.error('Failed to get session user:', error)
    return null
  }
}

export async function deleteSession(token: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { token },
    })
  } catch (error) {
    console.error('Failed to delete session:', error)
    throw new Error('Failed to delete session')
  }
}

export async function deleteUserSessions(userId: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { userId },
    })
  } catch (error) {
    console.error('Failed to delete user sessions:', error)
    throw new Error('Failed to delete user sessions')
  }
}
