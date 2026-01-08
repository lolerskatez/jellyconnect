import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { apiRateLimit } from '@/app/lib/rate-limit'
import { authLogger } from '@/app/lib/logger'
import { verifyAccessToken } from '@/app/lib/auth'
import { database } from '@/app/lib/db'

/**
 * Get current user session
 * Returns user info if valid session exists, 401 if not
 */
async function getSessionHandler(req: NextRequest) {
  try {
    authLogger.debug('Checking session')

    // First try NextAuth session
    const session = await getServerSession(authOptions)

    if (session?.user) {
      authLogger.info('NextAuth session found', { userEmail: session.user.email })
      return NextResponse.json({ user: session.user })
    }

    // If no NextAuth session, check for custom JWT token (from OIDC callback)
    const token = req.cookies.get('next-auth.session-token')?.value
    if (token) {
      const payload = await verifyAccessToken(token)
      if (payload && payload.sub) {
        // Find user in database
        const user = database.users.find(u => u.id === payload.sub)
        if (user) {
          authLogger.info('Custom JWT session found', { userEmail: user.email, jellyfinId: user.jellyfinId })

          // Return user data in NextAuth-compatible format
          const userData = {
            id: user.id,
            jellyfinId: user.jellyfinId,
            email: user.email,
            name: user.displayName,
            oidcProvider: user.oidcProvider,
            token: user.jellyfinPasswordEncrypted ? '' : '', // Jellyfin token not stored in session for security
          }

          return NextResponse.json({ user: userData })
        } else {
          authLogger.warn('Custom JWT valid but user not found in database', { sub: payload.sub })
        }
      } else {
        authLogger.debug('Custom JWT invalid or expired')
      }
    }

    authLogger.debug('No active session found')
    return NextResponse.json({ user: null }, { status: 401 })
  } catch (error) {
    authLogger.error('Session check error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ user: null }, { status: 401 })
  }
}

export async function GET(req: NextRequest) {
  return apiRateLimit(req, () => getSessionHandler(req));
}
