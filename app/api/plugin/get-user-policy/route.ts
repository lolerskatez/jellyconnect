import { NextRequest, NextResponse } from 'next/server'
import { pluginLogger } from '@/app/lib/logger'
import { successResponse, errorResponse, validationErrorResponse } from '@/app/lib/api-response'
import { database } from '@/app/lib/db'
import { getRolePolicyForJellyfin, mapGroupsToRole } from '@/app/lib/oidc-group-mapping'

/**
 * Gets Jellyfin user policies based on OIDC groups
 * Called by plugin to set appropriate permissions for the user
 * Uses the centralized mapGroupsToRole() function to respect configured group mappings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groups = [], userId, email } = body

    // Validate required fields
    if (!Array.isArray(groups)) {
      pluginLogger.warn('Invalid groups parameter')
      return NextResponse.json(
        validationErrorResponse([
          { path: 'groups', message: 'groups must be an array' }
        ]),
        { status: 400 }
      )
    }

    pluginLogger.info('Getting user policy', { groups, userId, email })

    // Use centralized mapGroupsToRole() to respect configured group mappings
    const mappedRole = mapGroupsToRole(groups)
    
    // If no valid role mapped (user not in any configured groups), deny with 'user' as default
    // but log a warning
    let role: 'admin' | 'powerUser' | 'user' = 'user'
    if (mappedRole === null) {
      pluginLogger.warn('User does not belong to any configured groups, defaulting to user role', { groups, userId, email })
    } else {
      role = mappedRole
    }

    // Get the policy object for this role
    const policy = getRolePolicyForJellyfin(role)

    // If userId is provided, update the user's role in database
    if (userId) {
      const user = database.users.find(u => u.jellyfinId === userId)
      if (user) {
        // Store the role information in oidcGroups if not already there
        // This persists the role mapping in the database
        if (!user.oidcGroups) {
          user.oidcGroups = []
        }
        // Update groups if different
        if (!user.oidcGroups.some(g => g === `role:${role}`)) {
          user.oidcGroups.push(`role:${role}`)
        }

        pluginLogger.info('Updated user role in database', { userId, role })
      }
    }

    pluginLogger.info('User policy generated', { role, groups })

    return NextResponse.json(
      successResponse(
        {
          role,
          policy,
          groups
        },
        'User policy retrieved successfully'
      ),
      { status: 200 }
    )
  } catch (error) {
    pluginLogger.error('Get user policy error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to get user policy',
        'POLICY_ERROR',
        500
      ),
      { status: 500 }
    )
  }
}
