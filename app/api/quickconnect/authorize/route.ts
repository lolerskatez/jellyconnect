import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'
import { verifyAccessToken } from '@/app/lib/auth'
import { database } from '@/app/lib/db'
import { decrypt } from '@/app/lib/encryption'
import { quickConnectLogger } from '@/app/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const config = getConfig()
    if (!config.jellyfinUrl || !config.apiKey) {
      quickConnectLogger.error('Jellyfin not configured', { 
        hasUrl: !!config.jellyfinUrl, 
        hasApiKey: !!config.apiKey,
        apiKeyLength: config.apiKey?.length || 0
      })
      return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
    }

    // Log all cookies for debugging
    const cookies = request.cookies.getAll()
    quickConnectLogger.debug('Available cookies on request', { cookieNames: cookies.map(c => c.name), cookieCount: cookies.length })

    // Enhanced session cookie retrieval with fallback
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value 
      || request.cookies.get('__Secure-next-auth.session-token')?.value
      || request.cookies.get('auth-token')?.value; // Fallback for custom token names

    quickConnectLogger.debug('Session cookie check', {
      cookieNames: cookies.map(c => c.name),
      cookieCount: cookies.length,
      sessionCookieFound: !!sessionCookie,
      sessionCookieLength: sessionCookie ? sessionCookie.length : 0
    });

    if (!sessionCookie) {
      quickConnectLogger.warn('No session cookie found - user must be logged in first', { code });
      return NextResponse.json({ error: 'Not authenticated - please log in first to authorize this session' }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionCookie)
    if (!payload || !payload.jellyfinId) {
      quickConnectLogger.warn('Invalid or expired session token', { code, hasPayload: !!payload })
      return NextResponse.json({ error: 'Session invalid or expired - please log in again' }, { status: 401 })
    }

    // Find the user in our database to get their Jellyfin ID and credentials
    const user = database.users.find(u => u.id === payload.sub || u.jellyfinId === payload.jellyfinId)
    if (!user) {
      quickConnectLogger.error('Session user not found in database', { payload_sub: payload.sub, payload_jellyfinId: payload.jellyfinId })
      return NextResponse.json({ error: 'User not found in system' }, { status: 404 })
    }

    // If we have a user, find their Jellyfin ID for later authorization attempts
    if (user && !user.jellyfinId) {
      quickConnectLogger.warn('User found but not linked to Jellyfin', { userId: user.id, email: user.email })
      return NextResponse.json({ error: 'User not linked to Jellyfin. Please log in with your Jellyfin credentials first.' }, { status: 400 })
    }

    console.log('[Quick Connect Authorize] Attempting to authorize code:', code, 'for user:', user.email || user.jellyfinId)

    quickConnectLogger.info('Attempting to authorize Quick Connect code', { code, userId: user.id, userEmail: user.email, jellyfinId: user.jellyfinId })

    if (!user.jellyfinId) {
      quickConnectLogger.warn('User not linked to Jellyfin', { userId: user.id, email: user.email })
      return NextResponse.json({ error: 'User not linked to Jellyfin. Please log in with your Jellyfin credentials first.' }, { status: 400 })
    }

    if (!user.jellyfinPasswordEncrypted || !user.jellyfinUsername) {
      quickConnectLogger.warn('User Jellyfin credentials not stored', { userId: user.id })
      return NextResponse.json({ error: 'Your Jellyfin credentials are not stored. Please log in with your Jellyfin account first.' }, { status: 400 })
    }

    try {
      const password = decrypt(user.jellyfinPasswordEncrypted)
      
      // Authenticate the user to get their access token
      const authResponse = await fetch(`${config.jellyfinUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization': `MediaBrowser Client="JellyConnect", Device="QuickConnect", DeviceId="jellyconnect-qc-${user.jellyfinId}", Version="1.0.0"`
        },
        body: JSON.stringify({
          Username: user.jellyfinUsername,
          Pw: password
        }),
        signal: AbortSignal.timeout(10000)
      })

      if (!authResponse.ok) {
        quickConnectLogger.error('Failed to authenticate user with Jellyfin', { userId: user.id, status: authResponse.status })
        return NextResponse.json({ error: 'Failed to authenticate with Jellyfin. Your stored credentials may be incorrect.' }, { status: 401 })
      }

      const authData = await authResponse.json()
      const userAccessToken = authData.AccessToken

      if (!userAccessToken) {
        quickConnectLogger.error('No access token returned from Jellyfin', { userId: user.id })
        return NextResponse.json({ error: 'Failed to get access token from Jellyfin' }, { status: 500 })
      }

      // Now authorize QuickConnect using the user's own token
      const authorizeRes = await fetch(`${config.jellyfinUrl}/QuickConnect/Authorize?code=${code}`, {
        method: 'POST',
        headers: {
          'X-Emby-Token': userAccessToken,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      })

      if (!authorizeRes.ok) {
        const errorText = await authorizeRes.text().catch(() => 'Unknown error')
        quickConnectLogger.error('Failed to authorize QuickConnect code', { userId: user.id, code, status: authorizeRes.status, error: errorText })
        return NextResponse.json({ error: 'Failed to authorize QuickConnect code', details: errorText.substring(0, 200) }, { status: 500 })
      }

      const result = await authorizeRes.json()
      quickConnectLogger.info('Successfully authorized Quick Connect', { userId: user.jellyfinId, username: user.jellyfinUsername })
      return NextResponse.json({ 
        success: true, 
        userId: user.jellyfinId, 
        username: user.jellyfinUsername,
        authorized: result 
      })

    } catch (error) {
      quickConnectLogger.error('Error during QuickConnect authorization', { userId: user.id, error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: 'Error processing QuickConnect authorization', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
  } catch (error) {
    quickConnectLogger.error('Quick Connect authorization endpoint error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ 
      error: 'Failed to authorize Quick Connect',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
