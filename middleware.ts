import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Force HTTPS detection for NextAuth callback URL construction
  const headers = new Headers(request.headers)

  // Ensure X-Forwarded-Proto is set to https for proper callback URL construction
  if (!headers.get('x-forwarded-proto') || headers.get('x-forwarded-proto') !== 'https') {
    headers.set('x-forwarded-proto', 'https')
  }

  // Ensure host is set correctly
  if (!headers.get('x-forwarded-host')) {
    headers.set('x-forwarded-host', 'c.tanjiro.one')
  }

  return NextResponse.next({
    request: {
      headers: headers,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes for auth callbacks
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}