import { NextRequest, NextResponse } from 'next/server'
import { database, saveDatabase } from '@/app/lib/db'
import { getConfig } from '@/app/lib/config'
import { generateSecurePassword } from '@/app/lib/secure-password'
import { encrypt } from '@/app/lib/encryption'
import { verifyAccessToken } from '@/app/lib/auth'

// Security: This endpoint must be explicitly enabled
const MIGRATION_ENABLED = process.env.ENABLE_SSO_MIGRATION === 'true'

/**
 * POST /api/admin/migrate-sso-passwords
 * 
 * Migrates existing SSO users by:
 * 1. Generating a new secure password
 * 2. Updating the password in Jellyfin
 * 3. Storing the encrypted password in the database
 * 
 * This enables QuickConnect to work properly for SSO users.
 * 
 * SECURITY REQUIREMENTS:
 * - Requires admin authentication
 * - Requires ENABLE_SSO_MIGRATION=true in environment
 * - Requires {"confirm": true} in request body
 * - All operations are audit logged
 * 
 * RECOMMENDATION: Remove this endpoint after migration is complete.
 */
export async function POST(request: NextRequest) {
  try {
    // Security check: endpoint must be explicitly enabled
    if (!MIGRATION_ENABLED) {
      return NextResponse.json(
        { 
          error: 'Migration endpoint disabled',
          hint: 'Set ENABLE_SSO_MIGRATION=true in .env.local to enable this endpoint'
        }, 
        { status: 403 }
      )
    }

    // Parse request body for confirmation
    let body: { confirm?: boolean; userId?: string } = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is allowed for GET-like checks
    }

    // Require explicit confirmation
    if (body.confirm !== true) {
      return NextResponse.json(
        { 
          error: 'Confirmation required',
          hint: 'Send {"confirm": true} in request body to proceed',
          warning: 'This will reset Jellyfin passwords for all SSO users without stored credentials'
        }, 
        { status: 400 }
      )
    }

    // Verify admin authentication
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value
      || request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await verifyAccessToken(sessionCookie)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if user is admin
    const currentUser = database.users.find(u => u.id === payload.sub || u.jellyfinId === payload.jellyfinId)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify admin status from Jellyfin
    const config = getConfig()
    if (!config.jellyfinUrl || !config.apiKey) {
      return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
    }

    const jellyfinUserRes = await fetch(`${config.jellyfinUrl}/Users/${currentUser.jellyfinId}`, {
      headers: { 'X-Emby-Token': config.apiKey }
    })

    if (!jellyfinUserRes.ok) {
      return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 })
    }

    const jellyfinUser = await jellyfinUserRes.json()
    if (!jellyfinUser.Policy?.IsAdministrator) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Audit log: Migration started
    const auditEntry = {
      id: crypto.randomUUID(),
      userId: currentUser.jellyfinId,
      action: 'SSO_PASSWORD_MIGRATION_STARTED',
      details: `Admin ${currentUser.email} initiated SSO password migration`,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      createdAt: new Date().toISOString()
    }
    database.auditLog.push(auditEntry)

    // Find SSO users to migrate (optionally filter by userId)
    let ssoUsersToMigrate = database.users.filter(
      u => u.oidcProvider && !u.jellyfinPasswordEncrypted && u.jellyfinId
    )

    // If specific userId provided, only migrate that user
    if (body.userId) {
      ssoUsersToMigrate = ssoUsersToMigrate.filter(u => u.jellyfinId === body.userId)
    }

    console.log(`[Migration] Found ${ssoUsersToMigrate.length} SSO users to migrate`)

    const results: {
      success: { email: string; jellyfinId: string }[]
      failed: { email: string; jellyfinId: string; error: string }[]
    } = {
      success: [],
      failed: []
    }

    for (const user of ssoUsersToMigrate) {
      try {
        const newPassword = generateSecurePassword()

        // Update password in Jellyfin
        const updatePasswordRes = await fetch(
          `${config.jellyfinUrl}/Users/${user.jellyfinId}/Password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Emby-Token': config.apiKey
            },
            body: JSON.stringify({
              NewPw: newPassword,
              ResetPassword: true // Admin can reset without current password
            })
          }
        )

        if (!updatePasswordRes.ok) {
          const errorText = await updatePasswordRes.text()
          console.error(`[Migration] Failed to update password for ${user.email}:`, errorText)
          results.failed.push({
            email: user.email || 'unknown',
            jellyfinId: user.jellyfinId,
            error: `Jellyfin API error: ${updatePasswordRes.status}`
          })
          continue
        }

        // Store encrypted password in database
        user.jellyfinPasswordEncrypted = encrypt(newPassword)
        user.updatedAt = new Date().toISOString()

        console.log(`[Migration] Successfully migrated user: ${user.email}`)
        results.success.push({
          email: user.email || 'unknown',
          jellyfinId: user.jellyfinId
        })

      } catch (error) {
        console.error(`[Migration] Error migrating user ${user.email}:`, error)
        results.failed.push({
          email: user.email || 'unknown',
          jellyfinId: user.jellyfinId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Audit log: Migration completed
    const completionEntry = {
      id: crypto.randomUUID(),
      userId: currentUser.jellyfinId,
      action: 'SSO_PASSWORD_MIGRATION_COMPLETED',
      details: `Migration complete: ${results.success.length} succeeded, ${results.failed.length} failed`,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      createdAt: new Date().toISOString()
    }
    database.auditLog.push(completionEntry)

    // Save database
    saveDatabase()

    return NextResponse.json({
      message: 'Migration complete',
      totalFound: ssoUsersToMigrate.length,
      successful: results.success.length,
      failed: results.failed.length,
      results,
      recommendation: 'Remove ENABLE_SSO_MIGRATION from .env.local or delete this endpoint now that migration is complete'
    })

  } catch (error) {
    console.error('[Migration] Error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/migrate-sso-passwords
 * 
 * Returns information about SSO users that need migration.
 * This endpoint is always accessible to admins (doesn't require ENABLE_SSO_MIGRATION)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value
      || request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await verifyAccessToken(sessionCookie)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Find SSO users
    const allSsoUsers = database.users.filter(u => u.oidcProvider)
    const needsMigration = allSsoUsers.filter(u => !u.jellyfinPasswordEncrypted)
    const alreadyMigrated = allSsoUsers.filter(u => u.jellyfinPasswordEncrypted)

    return NextResponse.json({
      migrationEnabled: MIGRATION_ENABLED,
      totalSsoUsers: allSsoUsers.length,
      needsMigration: needsMigration.length,
      alreadyMigrated: alreadyMigrated.length,
      usersNeedingMigration: needsMigration.map(u => ({
        email: u.email,
        jellyfinId: u.jellyfinId,
        jellyfinUsername: u.jellyfinUsername,
        oidcProvider: u.oidcProvider
      })),
      instructions: !MIGRATION_ENABLED 
        ? 'To enable migration, add ENABLE_SSO_MIGRATION=true to .env.local and restart the server'
        : 'Send POST with {"confirm": true} to migrate all users, or {"confirm": true, "userId": "..."}  for a single user'
    })

  } catch (error) {
    console.error('[Migration] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    )
  }
}
