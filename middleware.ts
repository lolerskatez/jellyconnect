import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Preserve headers for proper request handling
  // Headers will be set by reverse proxy in production
  // In development, they're set by the environment
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes for auth callbacks
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}