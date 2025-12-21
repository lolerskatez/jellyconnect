import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/app/lib/auth'
import { getConfig } from '@/app/lib/config'

/**
 * Check current session from cookie
 * Returns user info if valid session exists
 */
export async function GET(req: NextRequest) {
  try {
    // Get the session token from cookies
    const token = req.cookies.get('next-auth.session-token')?.value

    console.log('[SESSION] Token from cookie:', token ? 'present' : 'missing')

    if (!token) {
      console.log('[SESSION] No token found in cookie')
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Verify the token
    console.log('[SESSION] Token received, length:', token.length)
    console.log('[SESSION] Verifying token...')
    const payload = await verifyAccessToken(token)

    console.log('[SESSION] Token verification result:', payload ? 'valid' : 'invalid')

    if (!payload) {
      console.log('[SESSION] Token verification failed - payload is null')
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Get the user's Jellyfin policy to check if they're an admin
    let isAdmin = false
    try {
      const config = getConfig()
      if (config.jellyfinUrl && config.apiKey && payload.jellyfinId) {
        const userResponse = await fetch(`${config.jellyfinUrl}/Users/${payload.jellyfinId}`, {
          headers: {
            'X-Emby-Token': config.apiKey,
          },
        })
        if (userResponse.ok) {
          const jellyfinUser = await userResponse.json()
          isAdmin = jellyfinUser.Policy?.IsAdministrator === true
          console.log('[SESSION] Jellyfin user policy check - isAdmin:', isAdmin)
        }
      }
    } catch (error) {
      console.error('[SESSION] Error checking Jellyfin admin status:', error)
    }

    console.log('[SESSION] Returning user data:', payload.email, 'isAdmin:', isAdmin)
    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        jellyfinId: payload.jellyfinId,
        oidcProvider: payload.oidcProvider,
        token: token,
        isAdmin: isAdmin,
      }
    })
  } catch (error) {
    console.error('[SESSION] Catch block error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
