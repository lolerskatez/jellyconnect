import { NextRequest, NextResponse } from 'next/server'
import { apiRateLimit } from '@/app/lib/rate-limit'
import { authLogger } from '@/app/lib/logger'
import { verifyAccessToken } from '@/app/lib/auth'
import { database } from '@/app/lib/db'
import { getConfig } from '@/app/lib/config'
import { JellyfinAuth, buildJellyfinBaseUrl } from '@/app/lib/jellyfin'

/**
 * Get current user session
 * Returns user info if valid session exists, 401 if not
 */
async function getSessionHandler(req: NextRequest) {
  try {
    authLogger.debug('Checking session', {
      cookieCount: req.cookies.getAll().length,
      cookieNames: req.cookies.getAll().map(c => c.name),
      hasSessionToken: !!req.cookies.get('next-auth.session-token')?.value,
      hasSecureToken: !!req.cookies.get('__Secure-next-auth.session-token')?.value,
    })

    // Check for custom JWT token (from OIDC callback or NextAuth)
    const token = req.cookies.get('next-auth.session-token')?.value 
      || req.cookies.get('__Secure-next-auth.session-token')?.value

    if (token) {
      authLogger.debug('Found session token in cookies', { tokenLength: token.length })
      const payload = await verifyAccessToken(token)
      if (payload && payload.sub) {
        // Find user in database
        const user = database.users.find(u => u.id === payload.sub)
        if (user) {
          authLogger.info('JWT session found', { userEmail: user.email, jellyfinId: user.jellyfinId })

          // Check Jellyfin policy to determine admin status
          let isAdmin = false
          try {
            const config = getConfig()
            if (config.jellyfinUrl && config.apiKey) {
              const baseUrl = buildJellyfinBaseUrl(config.jellyfinUrl)
              authLogger.info('Checking Jellyfin admin status for SSO user', { 
                userId: user.id, 
                email: user.email,
                jellyfinId: user.jellyfinId,
                oidcGroups: user.oidcGroups,
                databaseRole: (user.oidcGroups && user.oidcGroups.length > 0) ? 'mapped from groups' : 'unknown',
                jellyfinUrl: config.jellyfinUrl,
                processedBaseUrl: baseUrl
              })
              const jellyfinAuth = new JellyfinAuth(baseUrl, config.apiKey)
              const jellyfinUser = await jellyfinAuth.getUserById(user.jellyfinId)
              isAdmin = jellyfinUser.Policy?.IsAdministrator || false
              authLogger.info('Jellyfin user policy check result', { 
                userId: user.id,
                jellyfinId: user.jellyfinId,
                policyIsAdministrator: jellyfinUser.Policy?.IsAdministrator,
                isAdmin,
                jellyfinUserName: jellyfinUser.Name,
                hasPolicy: !!jellyfinUser.Policy,
                policyEnableContentDeletion: jellyfinUser.Policy?.EnableContentDeletion,
                policyEnableAllFolders: jellyfinUser.Policy?.EnableAllFolders
              })
            } else {
              authLogger.warn('Cannot check Jellyfin admin status - missing config', { userId: user.id })
            }
          } catch (error) {
            authLogger.error('Failed to check Jellyfin admin status', { 
              userId: user.id, 
              error: error instanceof Error ? error.message : String(error) 
            })
            // Default to false on error
          }

          // Return user data in NextAuth-compatible format
          const userData = {
            id: user.id,
            jellyfinId: user.jellyfinId,
            email: user.email,
            name: user.displayName,
            oidcProvider: user.oidcProvider,
            isAdmin: isAdmin,
            token: user.jellyfinPasswordEncrypted ? '' : '', // Jellyfin token not stored in session for security
          }

          return NextResponse.json({ user: userData })
        } else {
          authLogger.warn('JWT valid but user not found in database', { sub: payload.sub })
        }
      } else {
        authLogger.debug('JWT invalid or expired')
      }
    }

    authLogger.debug('No active session found - no session token in cookies')
    // Return 200 with null user instead of 401 when no session exists
    // This allows the frontend to distinguish between "no session" vs "invalid session"
    return NextResponse.json({ user: null })
  } catch (error) {
    authLogger.error('Session check error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ user: null }, { status: 401 })
  }
}

export async function GET(req: NextRequest) {
  return apiRateLimit(req, () => getSessionHandler(req));
}
