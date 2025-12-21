import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/app/lib/db'

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

    console.log('[CALLBACK] Authentik callback received:', { code: code?.substring(0, 20) + '...', state, error })

    // Check for errors from Authentik
    if (error) {
      console.error('[CALLBACK] Authentik error:', error)
      return NextResponse.redirect(
        new URL(`/login?error=authentik_error&message=${encodeURIComponent(error)}`, req.url)
      )
    }

    if (!code) {
      console.error('[CALLBACK] No authorization code received')
      return NextResponse.redirect(new URL('/login?error=no_code', req.url))
    }

    if (!state) {
      console.error('[CALLBACK] No state received')
      return NextResponse.redirect(new URL('/login?error=no_state', req.url))
    }

    // Exchange code for tokens
    const tokenEndpoint = 'https://auth.tanjiro.one/application/o/token/'
    const clientId = 'l8bcn01TTCN3BbK04rXlbezEgld2G2Zx6BvBzTbV'
    const clientSecret = process.env.OIDC_CLIENT_SECRET || ''
    const redirectUri = `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host') || req.headers.get('host')}/api/auth/callback/authentik`

    console.log('[CALLBACK] Exchanging code for tokens:', {
      tokenEndpoint,
      clientId,
      redirectUri,
    })

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
      console.error('[CALLBACK] Token exchange failed:', error)
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange_failed&message=${encodeURIComponent(error.substring(0, 100))}`, req.url)
      )
    }

    const tokens = await tokenResponse.json()
    console.log('[CALLBACK] Tokens received:', {
      accessToken: tokens.access_token?.substring(0, 20) + '...',
      idToken: tokens.id_token?.substring(0, 20) + '...',
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
      console.error('[CALLBACK] Userinfo request failed:', error)
      return NextResponse.redirect(
        new URL(`/login?error=userinfo_failed&message=${encodeURIComponent(error.substring(0, 100))}`, req.url)
      )
    }

    const userinfo = await userinfoResponse.json()
    console.log('[CALLBACK] User info received:', {
      sub: userinfo.sub,
      email: userinfo.email,
      name: userinfo.name,
    })

    // Check if user exists or create them
    let user = database.users.find(u => u.email === userinfo.email)

    if (!user) {
      // Auto-create user in Jellyfin
      console.log('[CALLBACK] Creating new user:', userinfo.email)
      const jellyfinUrl = process.env.JELLYFIN_SERVER_URL || 'http://localhost:8096'
      const apiKey = (await import('@/app/lib/config')).getConfig().apiKey

      if (!apiKey) {
        console.error('[CALLBACK] Jellyfin API key not configured')
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
        console.error('[CALLBACK] Failed to create Jellyfin user:', error)
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
      console.log('[CALLBACK] User created:', newUser.email)
    } else {
      console.log('[CALLBACK] Existing user found:', user.email)
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

    console.log('[CALLBACK] Session token created:', sessionToken.substring(0, 20) + '...')

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
    console.error('[CALLBACK] Unexpected error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=server_error&message=${encodeURIComponent((error as Error).message.substring(0, 100))}`, req.url)
    )
  }
}
