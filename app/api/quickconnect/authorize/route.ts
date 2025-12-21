import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'
import { verifyAccessToken } from '@/app/lib/auth'
import { database } from '@/app/lib/db'
import { decrypt } from '@/app/lib/encryption'

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
              console.log('[Quick Connect Authorize] Successfully authorized with user token for:', user.jellyfinUsername)
              return NextResponse.json({ 
                success: true, 
                userId: user.jellyfinId, 
                username: user.jellyfinUsername,
                authorized: result 
              })
            } else {
              console.log('[Quick Connect Authorize] User token authorization failed:', authorizeRes.status)
            }
          }
        } else {
          console.log('[Quick Connect Authorize] User authentication failed:', authResponse.status)
        }
      } catch (cryptoError) {
        console.error('[Quick Connect Authorize] Failed to decrypt user credentials:', cryptoError)
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
      console.log('[Quick Connect Authorize] Authorized with userId parameter for:', user.jellyfinId)
      return NextResponse.json({ success: true, userId: user.jellyfinId, authorized: result })
    }

    const errorText = await authorizeRes.text()
    console.log('[Quick Connect Authorize] userId param approach failed:', authorizeRes.status, errorText)

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
      console.log('[Quick Connect Authorize] Authorized with X-Emby-Authorization header')
      return NextResponse.json({ success: true, userId: user.jellyfinId, authorized: result })
    }

    const error2 = await authorizeRes.text()
    console.log('[Quick Connect Authorize] X-Emby-Authorization approach failed:', authorizeRes.status, error2)

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
      console.warn('[Quick Connect Authorize] WARNING: Using basic admin authorization for code:', code)
      return NextResponse.json({ 
        success: true, 
        warning: 'QuickConnect authorized but may be associated with admin account. You may need to manually select your profile in the app.',
        fallbackUsed: true
      })
    }

    const fallbackError = await authorizeRes.text()
    console.error('[Quick Connect Authorize] All authorization attempts failed:', fallbackError)
    
    return NextResponse.json({ 
      error: 'Failed to authorize Quick Connect session',
      details: 'The QuickConnect code could not be authorized. Please try again or use another login method.',
      code: authorizeRes.status
    }, { status: 500 })

  } catch (error) {
    console.error('Authorize Quick Connect error:', error)
    return NextResponse.json({ error: 'Failed to authorize Quick Connect' }, { status: 500 })
  }
}
