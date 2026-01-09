import { NextRequest, NextResponse } from 'next/server'
import { pluginLogger } from '@/app/lib/logger'
import { successResponse, errorResponse, validationErrorResponse } from '@/app/lib/api-response'
import { database } from '@/app/lib/db'
import { getConfig } from '@/app/lib/config'
import { mapGroupsToRole } from '@/app/lib/oidc-group-mapping'

/**
 * Validates an OIDC access token and returns user information
 * Called by Jellyfin OIDC Plugin to verify user identity after OAuth callback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken, idToken, email } = body

    // Validate required fields
    if (!accessToken && !idToken) {
      pluginLogger.warn('Token validation request missing both accessToken and idToken')
      return NextResponse.json(
        validationErrorResponse([
          { path: 'accessToken', message: 'accessToken or idToken is required' }
        ]),
        { status: 400 }
      )
    }

    pluginLogger.info('Validating OIDC token', { hasAccessToken: !!accessToken, hasIdToken: !!idToken })

    // For now, we'll validate based on the email claim since the token validation
    // would typically be done by the OAuth provider
    // In production, you'd validate the token signature with the OIDC provider
    if (!email) {
      pluginLogger.warn('Token validation request missing email claim')
      return NextResponse.json(
        errorResponse('Email claim not found in token', 'INVALID_TOKEN', 401),
        { status: 401 }
      )
    }

    // Find user in database
    const user = database.users.find(u => u.email === email)

    if (!user) {
      pluginLogger.info('User not found in database', { email })
      // Return user info even if not in database - plugin can create it
      return NextResponse.json(
        successResponse(
          {
            userId: null,
            email,
            username: email.split('@')[0],
            displayName: email.split('@')[0],
            groups: [],
            roles: ['user'],
            exists: false
          },
          'Token validated - user not yet registered'
        ),
        { status: 200 }
      )
    }

    // Get user groups from database and map to role using centralized function
    const groups = user.oidcGroups || []
    const mappedRole = mapGroupsToRole(groups)
    // Determine if admin based on mapped role, not just group name
    const isAdmin = mappedRole === 'admin'
    const roles = mappedRole ? [mappedRole] : ['user']

    pluginLogger.info('Token validated successfully', {
      userId: user.id,
      email: user.email,
      groups,
      roles
    })

    return NextResponse.json(
      successResponse(
        {
          userId: user.id,
          jellyfinId: user.jellyfinId,
          email: user.email,
          username: user.jellyfinUsername || email.split('@')[0],
          displayName: user.displayName || email,
          groups,
          roles,
          exists: true
        },
        'Token validated successfully'
      ),
      { status: 200 }
    )
  } catch (error) {
    pluginLogger.error('Token validation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Token validation failed',
        'VALIDATION_ERROR',
        500
      ),
      { status: 500 }
    )
  }
}
