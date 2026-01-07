import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { apiRateLimit } from '@/app/lib/rate-limit'

/**
 * Get current user session
 * Returns user info if valid session exists, 401 if not
 */
async function getSessionHandler(req: NextRequest) {
  try {
    console.log('[SESSION] Checking session')
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('[SESSION] No active session')
      return NextResponse.json({ user: null }, { status: 401 })
    }

    console.log('[SESSION] Session found for:', session.user.email)
    return NextResponse.json({ user: session.user })
  } catch (error) {
    console.error('[SESSION] Error:', error)
    return NextResponse.json({ user: null }, { status: 401 })
  }
}

export async function GET(req: NextRequest) {
  return apiRateLimit(req, () => getSessionHandler(req));
}
