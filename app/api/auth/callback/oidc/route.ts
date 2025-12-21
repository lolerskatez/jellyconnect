import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/app/lib/db'
import { getOIDCProviderConfig } from '@/app/lib/auth-settings'

// Get the base URL for redirects - use NEXTAUTH_URL to ensure consistency
function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'http://localhost:3000'
}

/**
 * Generic OIDC callback handler
 * Works with any configured OIDC provider (Authentik, Keycloak, etc.)
 * Receives the authorization code and exchanges it for tokens
 */
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl()
  
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('[OIDC CALLBACK] Callback received:', { code: code?.substring(0, 20) + '...', state, error })
    console.log('[OIDC CALLBACK] Using base URL for redirects:', baseUrl)

    // Check for errors from provider
    if (error) {
      const errorMsg = errorDescription || error
      console.error('[OIDC CALLBACK] Provider error:', errorMsg)
      return NextResponse.redirect(
        new URL(`/login?error=oidc_error&message=${encodeURIComponent(errorMsg.substring(0, 100))}`, baseUrl)
      )
    }

    if (!code) {
      console.error('[OIDC CALLBACK] No authorization code received')
      return NextResponse.redirect(new URL('/login?error=no_code', baseUrl))
    }

    if (!state) {
      console.error('[OIDC CALLBACK] No state received')
      return NextResponse.redirect(new URL('/login?error=no_state', baseUrl))
    }

    // Get provider configuration from database
    const providerConfig = getOIDCProviderConfig()
    if (!providerConfig) {
      console.error('[OIDC CALLBACK] No OIDC provider configured')
      return NextResponse.redirect(new URL('/login?error=provider_not_configured', baseUrl))
    }

    console.log('[OIDC CALLBACK] Using provider:', providerConfig.name)

    // Build redirect URI - must match what was sent to the provider
    const redirectUri = `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host') || req.headers.get('host')}/api/auth/callback/oidc`

    console.log('[OIDC CALLBACK] Exchanging code for tokens:', {
      provider: providerConfig.name,
      clientId: providerConfig.clientId,
      redirectUri,
    })

    // Exchange authorization code for tokens
    const tokenEndpoint = providerConfig.tokenEndpoint
    console.log('[OIDC CALLBACK] Token endpoint being used:', tokenEndpoint)
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[OIDC CALLBACK] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        endpoint: tokenEndpoint,
        error: errorText,
      })
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange_failed&message=${encodeURIComponent(tokenResponse.statusText || 'Unknown error')}`, baseUrl)
      )
    }

    const tokens = await tokenResponse.json()
    console.log('[OIDC CALLBACK] Tokens received:', {
      accessToken: tokens.access_token?.substring(0, 20) + '...',
      idToken: tokens.id_token?.substring(0, 20) + '...',
      expiresIn: tokens.expires_in,
    })

    // Fetch user information
    const userinfoEndpoint = providerConfig.userinfoEndpoint
    
    console.log('[OIDC CALLBACK] Fetching user info from:', userinfoEndpoint)
    
    const userinfoResponse = await fetch(userinfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userinfoResponse.ok) {
      const error = await userinfoResponse.text()
      console.error('[OIDC CALLBACK] Userinfo request failed:', userinfoResponse.status, error)
      return NextResponse.redirect(
        new URL(`/login?error=userinfo_failed&message=${encodeURIComponent(error.substring(0, 100))}`, baseUrl)
      )
    }

    const userinfo = await userinfoResponse.json()
    console.log('[OIDC CALLBACK] User info received:', {
      sub: userinfo.sub,
      email: userinfo.email,
      name: userinfo.name || userinfo.preferred_username,
    })

    if (!userinfo.email) {
      console.error('[OIDC CALLBACK] No email in user info')
      return NextResponse.redirect(new URL('/login?error=no_email', baseUrl))
    }

    // Check if user exists
    let user = database.users.find(u => u.email === userinfo.email)

    if (!user) {
      // Auto-create user in Jellyfin
      console.log('[OIDC CALLBACK] Creating new user:', userinfo.email)
      const { getConfig } = await import('@/app/lib/config')
      const config = getConfig()
      
      if (!config.jellyfinUrl || !config.apiKey) {
        console.error('[OIDC CALLBACK] Jellyfin not configured')
        return NextResponse.redirect(new URL('/login?error=jellyfin_not_configured', baseUrl))
      }

      const createUserResponse = await fetch(`${config.jellyfinUrl}/Users/New`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Token': config.apiKey,
        },
        body: JSON.stringify({
          Name: userinfo.preferred_username || userinfo.name || userinfo.email.split('@')[0],
        }),
      })

      if (!createUserResponse.ok) {
        const error = await createUserResponse.text()
        console.error('[OIDC CALLBACK] Failed to create Jellyfin user:', createUserResponse.status, error)
        return NextResponse.redirect(new URL('/login?error=user_creation_failed', baseUrl))
      }

      const jellyfinUser = await createUserResponse.json()
      user = {
        id: jellyfinUser.Id,
        jellyfinId: jellyfinUser.Id,
        email: userinfo.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        oidcProvider: providerConfig.name,
        oidcProviderId: userinfo.sub,
      } as any

      database.users.push(user)
      console.log('[OIDC CALLBACK] User created:', user.email)
    } else {
      console.log('[OIDC CALLBACK] Existing user found:', user.email)
      // Update OIDC provider info
      user.oidcProvider = providerConfig.name
      user.oidcProviderId = userinfo.sub
      user.updatedAt = new Date().toISOString()
    }

    // Create session JWT
    const { createAccessToken } = await import('@/app/lib/auth')
    const sessionToken = await createAccessToken({
      sub: user.id,
      email: user.email,
      jellyfinId: user.jellyfinId,
      oidcProvider: providerConfig.name,
    })

    console.log('[OIDC CALLBACK] Session token created, length:', sessionToken.length)

    // Redirect to callback complete page which will verify session and redirect to home
    const redirectUrl = new URL('/auth/callback/complete', baseUrl)
    console.log('[OIDC CALLBACK] Redirecting to:', redirectUrl.toString())
    
    const response = NextResponse.redirect(redirectUrl)

    // Set the NextAuth session cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    }
    
    response.cookies.set('next-auth.session-token', sessionToken, cookieOptions)
    
    // Log the Set-Cookie header
    const setCookieHeader = response.headers.get('Set-Cookie')
    console.log('[OIDC CALLBACK] Set-Cookie header:', setCookieHeader ? setCookieHeader.substring(0, 100) + '...' : 'NONE')
    console.log('[OIDC CALLBACK] Cookie options:', JSON.stringify(cookieOptions))

    return response
  } catch (error) {
    console.error('[OIDC CALLBACK] Unexpected error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=server_error&message=${encodeURIComponent((error as Error).message.substring(0, 100))}`, baseUrl)
    )
  }
}
