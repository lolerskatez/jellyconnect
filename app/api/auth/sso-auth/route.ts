import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { database, saveDatabaseImmediate } from '@/app/lib/db'
import { decrypt, encrypt } from '@/app/lib/encryption'
import { getConfig } from '@/app/lib/config'
import { authLogger } from '@/app/lib/logger'
import { verifyAccessToken } from '@/app/lib/auth'
import { generateSecurePassword } from '@/app/lib/secure-password'

/**
 * Authenticate SSO user with Jellyfin and return access token
 * This is called by the client after OIDC login to get Jellyfin access
 */
export async function GET(req: NextRequest) {
  try {
    authLogger.info('SSO auth request received')
    
    // First try NextAuth session
    let session = await getServerSession(authOptions)
    let userEmail = session?.user?.email

    authLogger.info('NextAuth session check', { hasSession: !!session, userEmail })

    // If no NextAuth session, check for custom JWT token (from OIDC callback)
    if (!userEmail) {
      const token = req.cookies.get('next-auth.session-token')?.value
      authLogger.info('Checking custom JWT token', { hasToken: !!token })
      
      if (token) {
        const payload = await verifyAccessToken(token)
        authLogger.info('Custom JWT payload', { payload: payload ? { sub: payload.sub, email: payload.email } : null })
        
        if (payload && payload.sub) {
          // Find user in database
          const dbUser = database.users.find(u => u.id === payload.sub)
          if (dbUser) {
            userEmail = dbUser.email
            authLogger.info('Found user from custom JWT', { userEmail, userId: dbUser.id })
          } else {
            authLogger.warn('Custom JWT valid but user not found in database', { sub: payload.sub })
          }
        } else {
          authLogger.debug('Custom JWT invalid or expired')
        }
      }
    }

    if (!userEmail) {
      authLogger.warn('No session found for SSO auth')
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    // Find user in database
    const user = database.users.find(u => u.email === userEmail)
    authLogger.info('Database user lookup', { userEmail, found: !!user, userId: user?.id })

    if (!user) {
      authLogger.error('User not found in database by email', { userEmail })
      // Log all users for debugging
      authLogger.info('All users in database', { users: database.users.map(u => ({ id: u.id, email: u.email })) })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const config = getConfig()
    if (!config.jellyfinUrl) {
      return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
    }

    // Check if user has stored Jellyfin credentials - if not, generate and store them
    let password: string
    if (!user.jellyfinPasswordEncrypted) {
      authLogger.info('No stored password for SSO user, generating new one', { userId: user.id })
      
      // Generate a new secure password
      password = generateSecurePassword()
      
      // Reset the user's password in Jellyfin using the API
      if (config.apiKey && user.jellyfinId) {
        try {
          const resetRes = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}/Password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Emby-Token': config.apiKey,
            },
            body: JSON.stringify({
              NewPw: password,
              ResetPassword: true
            })
          })
          
          if (resetRes.ok) {
            // Store the encrypted password
            user.jellyfinPasswordEncrypted = encrypt(password)
            user.updatedAt = new Date().toISOString()
            saveDatabaseImmediate()
            authLogger.info('Password generated and stored for SSO user', { userId: user.id })
          } else {
            authLogger.error('Failed to reset password in Jellyfin', { status: resetRes.status, userId: user.id })
            return NextResponse.json({ error: 'Failed to setup Jellyfin credentials' }, { status: 500 })
          }
        } catch (error) {
          authLogger.error('Error resetting password in Jellyfin', { error: error instanceof Error ? error.message : String(error) })
          return NextResponse.json({ error: 'Failed to setup Jellyfin credentials' }, { status: 500 })
        }
      } else {
        authLogger.error('Cannot generate password - no API key or Jellyfin ID', { hasApiKey: !!config.apiKey, jellyfinId: user.jellyfinId })
        return NextResponse.json({ error: 'No Jellyfin credentials stored and cannot generate' }, { status: 400 })
      }
    } else {
      // Decrypt existing password
      password = decrypt(user.jellyfinPasswordEncrypted)
    }
    
    if (!user.jellyfinUsername) {
      authLogger.error('No Jellyfin username for SSO user', { userId: user.id })
      return NextResponse.json({ error: 'No Jellyfin username stored' }, { status: 400 })
    }

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