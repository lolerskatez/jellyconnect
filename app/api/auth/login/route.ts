import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'
import { authRateLimit } from '@/app/lib/rate-limit'

async function loginHandler(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    const config = getConfig()
    if (!config.jellyfinUrl || !config.apiKey) {
      return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
    }

    // Authenticate with Jellyfin
    const authRes = await fetch(`${config.jellyfinUrl}/Users/AuthenticateByName`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': 'MediaBrowser Client="JellyConnect", Device="Web App", DeviceId="web-app-1", Version="1.0.0"'
      },
      body: JSON.stringify({
        Username: username,
        Pw: password
      })
    })

    if (!authRes.ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const authData = await authRes.json()
    const user = authData.User

    // Check if user is administrator (required for login)
    if (!user.Policy?.IsAdministrator) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    // Fetch displayName from our database
    let displayName: string | undefined
    try {
      const { getUserByJellyfinId } = await import('@/app/lib/db/queries')
      const dbUser = await getUserByJellyfinId(user.Id)
      displayName = dbUser?.displayName
      console.log('[Login] Fetched displayName from database:', displayName, 'for user:', user.Id)
    } catch (error) {
      console.log('[Login] Could not fetch displayName from database:', error)
    }

    return NextResponse.json({
      user,
      token: authData.AccessToken,
      displayName
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return authRateLimit(request, () => loginHandler(request));
}