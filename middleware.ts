// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'sfg_session'

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/']

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/invest', '/withdraw', '/history']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route))
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

  // If user has session token
  if (sessionToken) {
    // Redirect authenticated users from login/register to dashboard
    if (pathname === '/login' || pathname === '/register') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Allow access to protected routes
    return NextResponse.next()
  }

  // If no session token
  if (isProtectedRoute) {
    // Redirect to login if trying to access protected route
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Allow access to public routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
