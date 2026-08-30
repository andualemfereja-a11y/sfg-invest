'use server'

import { getUserFromToken } from '@/lib/server/session'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get('cookie') || ''
    const token = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('sfg_session='))?.split('=')[1]
    if (!token) return NextResponse.json({ ok: false, user: null }, { status: 401 })

    const data = await getUserFromToken(token)
    if (!data) return NextResponse.json({ ok: false, user: null }, { status: 401 })

    const { user } = data
    return NextResponse.json({ ok: true, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false, user: null }, { status: 500 })
  }
}
