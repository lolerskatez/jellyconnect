import { NextResponse } from 'next/server'

/**
 * Logout endpoint - clears the session cookie
 */
export async function POST() {
  const response = NextResponse.json({ success: true })
  
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

// Also support GET for simple redirects
export async function GET() {
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
