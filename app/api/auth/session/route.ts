import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'

/**
 * Get current user session
 * Returns user info if valid session exists, 401 if not
 */
export async function GET(req: NextRequest) {
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
