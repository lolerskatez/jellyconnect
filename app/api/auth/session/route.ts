import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { apiRateLimit } from '@/app/lib/rate-limit'
import { authLogger } from '@/app/lib/logger'

/**
 * Get current user session
 * Returns user info if valid session exists, 401 if not
 */
async function getSessionHandler(req: NextRequest) {
  try {
    authLogger.debug('Checking session')
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      authLogger.debug('No active session')
      return NextResponse.json({ user: null }, { status: 401 })
    }

    authLogger.info('Session found', { userEmail: session.user.email })
    return NextResponse.json({ user: session.user })
  } catch (error) {
    authLogger.error('Session check error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ user: null }, { status: 401 })
  }
}

export async function GET(req: NextRequest) {
  return apiRateLimit(req, () => getSessionHandler(req));
}
