// app/actions/auth.ts
'use server'

import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword, createSession, deleteSession } from '@/lib/auth'
import { registerSchema, loginSchema } from '@/lib/validation'
import { normalizePhone } from '@/lib/format'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'sfg_session'

export interface AuthResult {
  ok: boolean
  error?: string
  userId?: string
  token?: string
}

export async function registerAction(input: unknown): Promise<AuthResult> {
  try {
    const parsed = registerSchema.parse(input)
    const phone = normalizePhone(parsed.phone)

    if (!phone) {
      return { ok: false, error: 'Invalid phone number' }
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { phone },
    })

    if (existing) {
      return { ok: false, error: 'This phone number is already registered' }
    }

    // Hash password
    const passwordHash = await hashPassword(parsed.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone,
        passwordHash,
        baseBalance: 0,
      },
    })

    // Create session
    const token = await createSession(user.id)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return {
      ok: true,
      userId: user.id,
      token,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Registration failed' }
  }
}

export async function loginAction(input: unknown): Promise<AuthResult> {
  try {
    const parsed = loginSchema.parse(input)
    const phone = normalizePhone(parsed.phone)

    if (!phone) {
      return { ok: false, error: 'Invalid phone number' }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { phone },
    })

    if (!user) {
      return { ok: false, error: 'Incorrect phone number or password' }
    }

    // Verify password
    const passwordMatch = await verifyPassword(parsed.password, user.passwordHash)

    if (!passwordMatch) {
      return { ok: false, error: 'Incorrect phone number or password' }
    }

    // Create session
    const token = await createSession(user.id)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return {
      ok: true,
      userId: user.id,
      token,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Login failed' }
  }
}

export async function logoutAction(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (token) {
      await deleteSession(token)
    }

    cookieStore.delete(SESSION_COOKIE_NAME)

    return { ok: true }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Logout failed' }
  }
}

export async function getSessionAction(): Promise<{
  ok: boolean
  user?: {
    id: string
    firstName: string
    lastName: string
    phone: string
    baseBalance: number
    createdAt: Date
  } | null
  error?: string
}> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return { ok: true, user: null }
    }

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

    if (!session) {
      cookieStore.delete(SESSION_COOKIE_NAME)
      return { ok: true, user: null }
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } })
      cookieStore.delete(SESSION_COOKIE_NAME)
      return { ok: true, user: null }
    }

    return { ok: true, user: session.user }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message, user: null }
    }
    return { ok: false, error: 'Failed to get session', user: null }
  }
}
