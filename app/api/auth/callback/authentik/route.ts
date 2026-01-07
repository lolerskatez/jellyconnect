import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/app/lib/db'
import { authLogger } from '@/app/lib/logger'

/**
 * Handle Authentik OAuth callback
 * This endpoint receives the authorization code from Authentik
 * and exchanges it for tokens, then creates a session
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    authLogger.info('Authentik callback received', { codePrefix: code?.substring(0, 20), state, error })

    // Check for errors from Authentik
    if (error) {
      authLogger.error('Authentik error in callback', { error })
      return NextResponse.redirect(
        new URL(`/login?error=authentik_error&message=${encodeURIComponent(error)}`, req.url)
      )
    }

    if (!code) {
      authLogger.error('No authorization code received in Authentik callback')
      return NextResponse.redirect(new URL('/login?error=no_code', req.url))
    }

    if (!state) {
      authLogger.error('No state received in Authentik callback')
      return NextResponse.redirect(new URL('/login?error=no_state', req.url))
    }

    // Exchange code for tokens
    const tokenEndpoint = 'https://auth.tanjiro.one/application/o/token/'
    const clientId = 'l8bcn01TTCN3BbK04rXlbezEgld2G2Zx6BvBzTbV'
    const clientSecret = process.env.OIDC_CLIENT_SECRET || ''
    const redirectUri = `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host') || req.headers.get('host')}/api/auth/callback/authentik`

    authLogger.info('Exchanging Authentik code for tokens', { tokenEndpoint, clientId, redirectUri })

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      authLogger.error('Authentik token exchange failed', { status: tokenResponse.status, error })
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange_failed&message=${encodeURIComponent(error.substring(0, 100))}`, req.url)
      )
    }

    const tokens = await tokenResponse.json()
    authLogger.info('Authentik tokens received', {
      accessTokenPrefix: tokens.access_token?.substring(0, 20),
      idTokenPrefix: tokens.id_token?.substring(0, 20),
    })

    // Fetch user info
    const userinfoEndpoint = 'https://auth.tanjiro.one/application/o/userinfo/'
    const userinfoResponse = await fetch(userinfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userinfoResponse.ok) {
      const error = await userinfoResponse.text()
      authLogger.error('Authentik userinfo request failed', { error })
      return NextResponse.redirect(
        new URL(`/login?error=userinfo_failed&message=${encodeURIComponent(error.substring(0, 100))}`, req.url)
      )
    }

    const userinfo = await userinfoResponse.json()
    authLogger.info('Authentik user info received', {
      sub: userinfo.sub,
      email: userinfo.email,
      name: userinfo.name,
    })

    // Check if user exists or create them
    let user = database.users.find(u => u.email === userinfo.email)

    if (!user) {
      // Auto-create user in Jellyfin
      authLogger.info('Creating new Authentik user', { email: userinfo.email })
      const jellyfinUrl = process.env.JELLYFIN_SERVER_URL || 'http://localhost:8096'
      const apiKey = (await import('@/app/lib/config')).getConfig().apiKey

      if (!apiKey) {
        authLogger.error('Jellyfin API key not configured for Authentik user creation')
        return NextResponse.redirect(new URL('/login?error=jellyfin_not_configured', req.url))
      }

      const createUserResponse = await fetch(`${jellyfinUrl}/Users/New`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Token': apiKey,
        },
        body: JSON.stringify({
          Name: userinfo.preferred_username || userinfo.email.split('@')[0],
        }),
      })

      if (!createUserResponse.ok) {
        const error = await createUserResponse.text()
        authLogger.error('Failed to create Jellyfin user for Authentik', { error })
        return NextResponse.redirect(new URL('/login?error=user_creation_failed', req.url))
      }

      const jellyfinUser = await createUserResponse.json()
      const newUser = {
        id: jellyfinUser.Id,
        jellyfinId: jellyfinUser.Id,
        email: userinfo.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        oidcProvider: 'authentik',
        oidcProviderId: userinfo.sub,
      } as any

      database.users.push(newUser)
      user = newUser
      authLogger.info('Authentik user created', { email: newUser.email })
    } else {
      authLogger.info('Existing Authentik user found', { email: user.email })
    }

    // At this point, user is always defined (either found or newly created)
    const currentUser = user!

    // Create session JWT
    const { createAccessToken } = await import('@/app/lib/auth')
    const sessionToken = await createAccessToken({
      sub: currentUser.id,
      email: currentUser.email,
      jellyfinId: currentUser.jellyfinId,
      oidcProvider: 'authentik',
    })

    authLogger.info('Authentik session token created', { tokenPrefix: sessionToken.substring(0, 20) })

    // Redirect to home with session set
    // Note: NextAuth session handling - we'll set this in the response
    const response = NextResponse.redirect(new URL('/', req.url))

    // Set the NextAuth session cookie
    // For JWT strategy, the session is stored in nextauth.session-token cookie
    response.cookies.set('next-auth.session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    authLogger.error('Unexpected error in Authentik callback', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.redirect(
      new URL(`/login?error=server_error&message=${encodeURIComponent((error as Error).message.substring(0, 100))}`, req.url)
    )
  }
}
