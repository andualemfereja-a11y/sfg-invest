'use server'

import { prisma } from '@/lib/prisma'
import argon2 from 'argon2'
import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/format'
import { getUserFromToken } from '@/lib/server/session'

export async function POST(req: Request) {
  try {
    const { phone, password } = await req.json()
    const normPhone = normalizePhone(phone)
    if (!normPhone) return NextResponse.json({ ok: false, error: 'Enter a valid phone number.' }, { status: 400 })
    if (!password) return NextResponse.json({ ok: false, error: 'Password is required.' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { phone: normPhone } })
    if (!user) return NextResponse.json({ ok: false, error: 'Incorrect phone number or password.' }, { status: 401 })

    const match = await argon2.verify(user.passwordHash, password)
    if (!match) return NextResponse.json({ ok: false, error: 'Incorrect phone number or password.' }, { status: 401 })

    // create session
    const crypto = await import('crypto')
    const token = crypto.randomBytes(48).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } })

    const res = NextResponse.json({ ok: true, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone } })
    res.cookies.set('sfg_session', token, { httpOnly: true, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30 })
    return res
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
