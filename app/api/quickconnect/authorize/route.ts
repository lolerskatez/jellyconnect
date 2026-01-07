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
      return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
    }

    // Get the currently logged-in user from the session
    // Try multiple cookie names for different environments
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value 
      || request.cookies.get('__Secure-next-auth.session-token')?.value
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await verifyAccessToken(sessionCookie)
    if (!payload || !payload.jellyfinId) {
      return NextResponse.json({ error: 'Invalid session or no Jellyfin user linked' }, { status: 401 })
    }

    // Find the user in our database to get their Jellyfin ID and credentials
    const user = database.users.find(u => u.id === payload.sub || u.jellyfinId === payload.jellyfinId)
    if (!user || !user.jellyfinId) {
      return NextResponse.json({ error: 'User not found or not linked to Jellyfin' }, { status: 404 })
    }

    console.log('[Quick Connect Authorize] Attempting to authorize code:', code, 'for user:', user.email || user.jellyfinId)

    quickConnectLogger.info('Attempting to authorize Quick Connect code', { code, userId: user.id, userEmail: user.email, jellyfinId: user.jellyfinId })

    // BEST APPROACH: Authenticate as the user using their stored credentials
    // This properly associates the QuickConnect authorization with the correct user
    if (user.jellyfinPasswordEncrypted && user.jellyfinUsername) {
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
          })
        })

        if (authResponse.ok) {
          const authData = await authResponse.json()
          const userAccessToken = authData.AccessToken

          if (userAccessToken) {
            // Now authorize QuickConnect using the user's own token
            const authorizeRes = await fetch(`${config.jellyfinUrl}/QuickConnect/Authorize?code=${code}`, {
              method: 'POST',
              headers: {
                'X-Emby-Token': userAccessToken,
                'Content-Type': 'application/json'
              }
            })

            if (authorizeRes.ok) {
              const result = await authorizeRes.json()
              quickConnectLogger.info('Successfully authorized Quick Connect with user token', { userId: user.jellyfinId, username: user.jellyfinUsername })
              return NextResponse.json({ 
                success: true, 
                userId: user.jellyfinId, 
                username: user.jellyfinUsername,
                authorized: result 
              })
            } else {
              quickConnectLogger.warn('User token authorization failed', { userId: user.jellyfinId, status: authorizeRes.status })
            }
          }
        } else {
          quickConnectLogger.warn('User authentication failed', { userId: user.jellyfinId, status: authResponse.status })
        }
      } catch (cryptoError) {
        quickConnectLogger.error('Failed to decrypt user credentials', { userId: user.id, error: cryptoError instanceof Error ? cryptoError.message : String(cryptoError) })
        // Fall through to admin-based approaches
      }
    }

    // FALLBACK 1: Try with userId parameter (Jellyfin 10.8+)
    let authorizeRes = await fetch(`${config.jellyfinUrl}/QuickConnect/Authorize?code=${code}&userId=${user.jellyfinId}`, {
      method: 'POST',
      headers: {
        'X-Emby-Token': config.apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (authorizeRes.ok) {
      const result = await authorizeRes.json()
      quickConnectLogger.info('Authorized with userId parameter', { userId: user.jellyfinId })
      return NextResponse.json({ success: true, userId: user.jellyfinId, authorized: result })
    }

    let errorText = ''
    try {
      errorText = await authorizeRes.text()
    } catch (e) {
      errorText = 'Could not read error response'
    }
    quickConnectLogger.warn('userId param approach failed', { userId: user.jellyfinId, status: authorizeRes.status, error: errorText })

    // FALLBACK 2: Try with X-Emby-Authorization header
    authorizeRes = await fetch(`${config.jellyfinUrl}/QuickConnect/Authorize?code=${code}`, {
      method: 'POST',
      headers: {
        'X-Emby-Token': config.apiKey,
        'X-Emby-Authorization': `MediaBrowser Client="JellyConnect", Device="Web", DeviceId="jellyconnect-${user.jellyfinId}", Version="1.0.0", UserId="${user.jellyfinId}"`,
        'Content-Type': 'application/json'
      }
    })

    if (authorizeRes.ok) {
      const result = await authorizeRes.json()
      quickConnectLogger.info('Authorized with X-Emby-Authorization header', { userId: user.jellyfinId })
      return NextResponse.json({ success: true, userId: user.jellyfinId, authorized: result })
    }

    let error2 = ''
    try {
      error2 = await authorizeRes.text()
    } catch (e) {
      error2 = 'Could not read error response'
    }
    quickConnectLogger.warn('X-Emby-Authorization approach failed', { userId: user.jellyfinId, status: authorizeRes.status, error: error2 })

    // FALLBACK 3: Basic admin authorization (will likely associate with admin user)
    authorizeRes = await fetch(`${config.jellyfinUrl}/QuickConnect/Authorize?code=${code}`, {
      method: 'POST',
      headers: {
        'X-Emby-Token': config.apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (authorizeRes.ok) {
      const result = await authorizeRes.json()
      quickConnectLogger.warn('Using basic admin authorization for Quick Connect', { code })
      return NextResponse.json({ 
        success: true, 
        warning: 'QuickConnect authorized but may be associated with admin account. You may need to manually select your profile in the app.',
        fallbackUsed: true
      })
    }

    let fallbackError = ''
    try {
      fallbackError = await authorizeRes.text()
    } catch (e) {
      fallbackError = 'Could not read error response'
    }
    quickConnectLogger.error('All Quick Connect authorization attempts failed', { code, status: authorizeRes.status, error: fallbackError })
    
    return NextResponse.json({ 
      error: 'Failed to authorize Quick Connect session',
      details: 'The QuickConnect code could not be authorized. Please try again or use another login method.',
      jellyfinStatus: authorizeRes.status,
      jellyfinError: fallbackError.substring(0, 200)
    }, { status: 500 })

  } catch (error) {
    quickConnectLogger.error('Quick Connect authorization endpoint error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ 
      error: 'Failed to authorize Quick Connect',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
