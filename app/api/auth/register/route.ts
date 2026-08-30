import { prisma } from '@/lib/prisma'
import argon2 from 'argon2'
import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/format'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { firstName, lastName, phone, password, confirmPassword } = body

    // Validation
    if (!firstName || !firstName.trim())
      return NextResponse.json({ ok: false, error: 'First name is required.' }, { status: 400 })
    if (!lastName || !lastName.trim())
      return NextResponse.json({ ok: false, error: 'Last name is required.' }, { status: 400 })
    const normPhone = normalizePhone(phone)
    if (!normPhone) return NextResponse.json({ ok: false, error: 'Enter a valid Ethiopian phone number.' }, { status: 400 })
    if (!password || password.length < 6) return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters.' }, { status: 400 })
    if (password !== confirmPassword) return NextResponse.json({ ok: false, error: 'Passwords do not match.' }, { status: 400 })

    // Unique phone
    const existing = await prisma.user.findUnique({ where: { phone: normPhone } })
    if (existing) return NextResponse.json({ ok: false, error: 'This phone number is already registered.' }, { status: 409 })

    // Hash password
    const passwordHash = await argon2.hash(password)

    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normPhone,
        passwordHash,
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
    })

    // Create session token and cookie (simple cookie flow)
    const token = cryptoRandom(48)
    const tokenHash = sha256(token)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
    await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } })

    const res = NextResponse.json({ ok: true, user })
    res.cookies.set('sfg_session', token, { httpOnly: true, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30 })
    return res
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

function cryptoRandom(len = 48) {
  return [...crypto.getRandomValues(new Uint8Array(len))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function sha256(str: string) {
  return Buffer.from(new Uint8Array(globalThis.crypto.subtle.digestSync('SHA-256', new TextEncoder().encode(str)))).toString('hex')
}
