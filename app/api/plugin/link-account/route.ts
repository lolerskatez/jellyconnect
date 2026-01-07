import { NextRequest, NextResponse } from 'next/server'
import { pluginLogger } from '@/app/lib/logger'
import { successResponse, errorResponse, validationErrorResponse } from '@/app/lib/api-response'
import { database, saveDatabaseImmediate } from '@/app/lib/db'
import { createUser, generateId, updateUser } from '@/app/lib/db/queries'
import { getConfig } from '@/app/lib/config'

/**
 * Links a Jellyfin user account to a JellyConnect account
 * Called after OIDC authentication to create/update user records
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      username,
      jellyfinUserId,
      displayName,
      groups = [],
      accessToken
    } = body

    // Validate required fields
    const errors: any[] = []
    if (!email) errors.push({ path: 'email', message: 'email is required' })
    if (!jellyfinUserId) errors.push({ path: 'jellyfinUserId', message: 'jellyfinUserId is required' })

    if (errors.length > 0) {
      pluginLogger.warn('Account linking request missing required fields', { errors })
      return NextResponse.json(
        validationErrorResponse(errors),
        { status: 400 }
      )
    }

    pluginLogger.info('Linking account', { email, jellyfinUserId, groups })

    // Check if user already exists
    let user = database.users.find(u => u.email === email || u.jellyfinId === jellyfinUserId)

    if (user) {
      // Update existing user
      pluginLogger.info('User exists, updating record', { userId: user.id, email })
      updateUser(user.id, {
        email,
        displayName: displayName || user.displayName
      })
      // Update OIDC groups if provided
      if (groups.length > 0) {
        user.oidcGroups = groups
      }
    } else {
      // Create new user
      pluginLogger.info('Creating new user account', { email, jellyfinUserId })
      const userId = generateId()
      createUser(
        userId,
        jellyfinUserId,
        email,
        undefined,
        displayName || email.split('@')[0]
      )
      // Fetch the created user
      user = database.users.find(u => u.id === userId)
      if (user && groups.length > 0) {
        user.oidcGroups = groups
      }
    }

    // Save database changes
    saveDatabaseImmediate()

    pluginLogger.info('Account linked successfully', {
      userId: user?.id,
      email,
      jellyfinId: jellyfinUserId
    })

    return NextResponse.json(
      successResponse(
        {
          userId: user?.id,
          email: user?.email,
          jellyfinId: user?.jellyfinId,
          linked: true,
          message: user ? 'Account updated' : 'Account created'
        },
        'Account linked successfully'
      ),
      { status: 200 }
    )
  } catch (error) {
    pluginLogger.error('Account linking error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Account linking failed',
        'LINK_ERROR',
        500
      ),
      { status: 500 }
    )
  }
}
