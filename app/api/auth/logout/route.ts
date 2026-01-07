import { NextRequest, NextResponse } from 'next/server'
import { authRateLimit } from '@/app/lib/rate-limit'
import { successResponse } from '@/app/lib/api-response'

/**
 * Logout endpoint - clears the session cookie
 */
async function postLogoutHandler(request: NextRequest) {
  const response = NextResponse.json(
    successResponse({}, 'Logout successful'),
    { status: 200 }
  )
  response.cookies.set('next-auth.session-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  })
  
  return response
}

// Also support GET for simple redirects
async function getLogoutHandler(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'http://localhost:3000'
  
  const response = NextResponse.redirect(new URL('/login', baseUrl))
  
  // Clear the session cookie
  response.cookies.set('next-auth.session-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  })
  
  return response
}

export async function POST(request: NextRequest) {
  return authRateLimit(request, () => postLogoutHandler(request));
}

export async function GET(request: NextRequest) {
  return authRateLimit(request, () => getLogoutHandler(request));
}
