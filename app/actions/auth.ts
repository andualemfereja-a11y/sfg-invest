// app/actions/auth.ts
'use server'

import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword, createSession, deleteSession } from '@/lib/auth'
import { registerSchema, loginSchema } from '@/lib/validation'
import { normalizePhone } from '@/lib/format'
import { cookies } from 'next/headers'
import { serializeData } from '@/lib/serialize'
import { Decimal } from '@prisma/client/runtime/library'

const SESSION_COOKIE_NAME = 'sfg_session'

export interface AuthResult {
  ok: boolean
  error?: string
  userId?: string
  token?: string
}

export async function registerAction(input: unknown): Promise<AuthResult> {
  try {
    console.log('🔐 Starting registration...')
    
    // Validate input
    const parsed = registerSchema.parse(input)
    console.log('✅ Input validated')
    
    const phone = normalizePhone(parsed.phone)
    if (!phone) {
      console.log('❌ Invalid phone number')
      return { ok: false, error: 'Invalid phone number' }
    }
    console.log('✅ Phone normalized:', phone)

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { phone },
    })

    if (existing) {
      console.log('❌ User already exists')
      return { ok: false, error: 'This phone number is already registered' }
    }
    console.log('✅ User does not exist')

    // Hash password
    const passwordHash = await hashPassword(parsed.password)
    console.log('✅ Password hashed')

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone,
        passwordHash,
        baseBalance: new Decimal(0),
      },
    })
    console.log('✅ User created in DB:', user.id)

    // Create session
    let token: string
    try {
      token = await createSession(user.id)
      console.log('✅ Session created')
    } catch (sessionError) {
      console.error('❌ Session creation failed:', sessionError)
      // Delete user if session creation fails
      await prisma.user.delete({ where: { id: user.id } })
      return { ok: false, error: 'Failed to create session. Please try again.' }
    }

    // Set session cookie
    try {
      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
      console.log('✅ Cookie set')
    } catch (cookieError) {
      console.error('❌ Cookie error (non-critical):', cookieError)
      // Don't fail the whole registration for cookie issues
    }

    console.log('✅ Registration successful')
    return {
      ok: true,
      userId: user.id,
      token,
    }
  } catch (error) {
    console.error('❌ Registration error:', error)
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Registration failed' }
  }
}

export async function loginAction(input: unknown): Promise<AuthResult> {
  try {
    console.log('🔐 Starting login...')
    
    const parsed = loginSchema.parse(input)
    console.log('✅ Input validated')
    
    const phone = normalizePhone(parsed.phone)
    if (!phone) {
      console.log('❌ Invalid phone number')
      return { ok: false, error: 'Invalid phone number' }
    }
    console.log('✅ Phone normalized')

    // Find user
    const user = await prisma.user.findUnique({
      where: { phone },
    })

    if (!user) {
      console.log('❌ User not found')
      return { ok: false, error: 'Incorrect phone number or password' }
    }
    console.log('✅ User found')

    // Verify password
    const passwordMatch = await verifyPassword(parsed.password, user.passwordHash)
    if (!passwordMatch) {
      console.log('❌ Password mismatch')
      return { ok: false, error: 'Incorrect phone number or password' }
    }
    console.log('✅ Password verified')

    // Create session
    let token: string
    try {
      token = await createSession(user.id)
      console.log('✅ Session created')
    } catch (sessionError) {
      console.error('❌ Session creation failed:', sessionError)
      return { ok: false, error: 'Failed to create session. Please try again.' }
    }

    // Set session cookie
    try {
      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
      console.log('✅ Cookie set')
    } catch (cookieError) {
      console.error('❌ Cookie error (non-critical):', cookieError)
    }

    console.log('✅ Login successful')
    return {
      ok: true,
      userId: user.id,
      token,
    }
  } catch (error) {
    console.error('❌ Login error:', error)
    if (error instanceof Error) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Login failed' }
  }
}

export async function logoutAction(): Promise<AuthResult> {
  try {
    console.log('🔐 Starting logout...')
    
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (token) {
      await deleteSession(token)
      console.log('✅ Session deleted')
    }

    cookieStore.delete(SESSION_COOKIE_NAME)
    console.log('✅ Cookie deleted')

    return { ok: true }
  } catch (error) {
    console.error('❌ Logout error:', error)
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
    baseBalance: string | number
    createdAt: string
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

    // Serialize the user data to handle Decimal and Date types
    const serializedUser = serializeData(session.user)

    return { ok: true, user: serializedUser }
  } catch (error) {
    console.error('❌ Session error:', error)
    if (error instanceof Error) {
      return { ok: false, error: error.message, user: null }
    }
    return { ok: false, error: 'Failed to get session', user: null }
  }
}
