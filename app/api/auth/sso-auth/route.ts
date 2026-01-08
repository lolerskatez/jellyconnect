import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { database } from '@/app/lib/db'
import { decrypt } from '@/app/lib/encryption'
import { getConfig } from '@/app/lib/config'
import { authLogger } from '@/app/lib/logger'

/**
 * Authenticate SSO user with Jellyfin and return access token
 * This is called by the client after OIDC login to get Jellyfin access
 */
export async function GET(req: NextRequest) {
  try {
    // Check if user has a valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    // Find user in database
    const user = database.users.find(u => u.email === session.user!.email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has stored Jellyfin credentials
    if (!user.jellyfinPasswordEncrypted || !user.jellyfinUsername) {
      return NextResponse.json({ error: 'No Jellyfin credentials stored' }, { status: 400 })
    }

    const config = getConfig()
    if (!config.jellyfinUrl) {
      return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
    }

    // Decrypt password and authenticate with Jellyfin
    const password = decrypt(user.jellyfinPasswordEncrypted)

    const authRes = await fetch(`${config.jellyfinUrl}/Users/AuthenticateByName`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': 'MediaBrowser Client="JellyConnect", Device="Web App", DeviceId="web-app-1", Version="1.0.0"'
      },
      body: JSON.stringify({
        Username: user.jellyfinUsername,
        Pw: password
      })
    })

    if (!authRes.ok) {
      authLogger.error('Jellyfin authentication failed for SSO user', {
        userId: user.id,
        username: user.jellyfinUsername,
        status: authRes.status
      })
      return NextResponse.json({ error: 'Jellyfin authentication failed' }, { status: 401 })
    }

    const authData = await authRes.json()
    const jellyfinUser = authData.User

    authLogger.info('SSO user authenticated with Jellyfin', {
      userId: user.id,
      jellyfinId: jellyfinUser.Id,
      username: user.jellyfinUsername
    })

    return NextResponse.json({
      token: authData.AccessToken,
      user: jellyfinUser
    })

  } catch (error) {
    authLogger.error('SSO Jellyfin auth error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}