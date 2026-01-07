import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'
import { authRateLimit } from '@/app/lib/rate-limit'
import { loginSchema } from '@/app/lib/validation'
import { authLogger } from '@/app/lib/logger'

async function loginHandler(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { username, password } = validationResult.data

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
      authLogger.debug('Fetched displayName from database', { displayName, userId: user.Id })
    } catch (error) {
      authLogger.warn('Could not fetch displayName from database', { error: error instanceof Error ? error.message : String(error), userId: user.Id })
    }

    logAuthEvent('login_success', user.Id, undefined, undefined, true)
    return NextResponse.json({
      user,
      token: authData.AccessToken,
      displayName
    })

  } catch (error) {
    authLogger.error('Login error', { error: error instanceof Error ? error.message : String(error) })
    logAuthEvent('login_failed', undefined, undefined, undefined, false)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return authRateLimit(request, () => loginHandler(request));
}