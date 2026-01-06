import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { getConfig } from '@/app/lib/config'

/**
 * Check current session using NextAuth
 * Returns user info if valid session exists
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[SESSION] Checking NextAuth session')

    const session = await getServerSession(req, authOptions)

    console.log('[SESSION] NextAuth session result:', session ? 'found' : 'null')

    if (!session || !session.user) {
      console.log('[SESSION] No active session')
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Get the user's Jellyfin policy to check if they're an admin
    let isAdmin = false
    let jellyfinName = session.user.name || ''
    let displayName = session.user.name || ''

    try {
      const config = getConfig()
      if (config.jellyfinUrl && config.apiKey && session.user.jellyfinId) {
        console.log('[SESSION] Checking Jellyfin admin status for user:', session.user.jellyfinId)
        const userResponse = await fetch(`${config.jellyfinUrl}/Users/${session.user.jellyfinId}`, {
          headers: {
            'X-Emby-Token': config.apiKey,
          },
        })
        if (userResponse.ok) {
          const jellyfinUser = await userResponse.json()
          isAdmin = jellyfinUser.Policy?.IsAdministrator === true
          jellyfinName = jellyfinUser.Name || session.user.name || ''
          console.log('[SESSION] Jellyfin user check - isAdmin:', isAdmin, 'name:', jellyfinName)
        } else {
          console.log('[SESSION] Failed to fetch Jellyfin user data:', userResponse.status)
        }
      } else {
        console.log('[SESSION] Jellyfin not configured or no jellyfinId')
      }
    } catch (error) {
      console.error('[SESSION] Error checking Jellyfin admin status:', error)
    }

    // Return session data in the format expected by the frontend
    const userData = {
      id: session.user.id || '',
      jellyfinId: session.user.jellyfinId || '',
      email: session.user.email || '',
      name: jellyfinName,
      displayName: displayName,
      jellyfinName: jellyfinName,
      isAdmin: isAdmin,
      oidcProvider: session.user.oidcProvider || null,
      token: 'nextauth-session-token' // Placeholder token for frontend compatibility
    }

    console.log('[SESSION] Returning user data:', {
      id: userData.id,
      email: userData.email,
      isAdmin: userData.isAdmin,
      oidcProvider: userData.oidcProvider
    })

    return NextResponse.json({ user: userData })
  } catch (error) {
    console.error('[SESSION] Error getting session:', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
    }

    // Fetch displayName from our database
    let displayName: string | undefined
    let jellyfinName: string | undefined
    try {
      const { getUserByJellyfinId } = await import('@/app/lib/db/queries')
      const dbUser = await getUserByJellyfinId(payload.jellyfinId)
      displayName = dbUser?.displayName
      console.log('[SESSION] Fetched displayName from database:', displayName, 'for jellyfinId:', payload.jellyfinId)
    } catch (error) {
      console.log('[SESSION] Could not fetch displayName from database:', error)
    }

    // Fetch Jellyfin username
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
          jellyfinName = jellyfinUser.Name
          console.log('[SESSION] Fetched Jellyfin username:', jellyfinName)
        }
      }
    } catch (error) {
      console.error('[SESSION] Error fetching Jellyfin username:', error)
    }

    console.log('[SESSION] Returning user data:', payload.email, 'isAdmin:', isAdmin)
    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        jellyfinId: payload.jellyfinId,
        jellyfinName: jellyfinName,
        oidcProvider: payload.oidcProvider || undefined,
        token: token,
        isAdmin: isAdmin,
        displayName: displayName,
      }
    })
  } catch (error) {
    console.error('[SESSION] Catch block error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
