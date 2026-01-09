import { NextRequest, NextResponse } from 'next/server'
import { getAuthSettings } from '@/app/lib/auth-settings'
import { mapGroupsToRole } from '@/app/lib/oidc-group-mapping'
import { authLogger } from '@/app/lib/logger'

/**
 * DEBUG ENDPOINT - Shows group mapping configuration and test results
 * This helps diagnose issues with OIDC group-to-role mapping
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testGroups } = body

    // Get current settings
    const settings = getAuthSettings()
    
    authLogger.info('DEBUG: Group mapping test', {
      testGroups,
      configuredAdminGroups: settings.oidcAdminGroups,
      configuredPowerUserGroups: settings.oidcPowerUserGroups,
      configuredUserGroups: settings.oidcUserGroups,
    })

    // Test the mapping
    const mappedRole = mapGroupsToRole(testGroups)

    const result = {
      testGroups,
      mappedRole,
      configuration: {
        adminGroups: settings.oidcAdminGroups || [],
        powerUserGroups: settings.oidcPowerUserGroups || [],
        userGroups: settings.oidcUserGroups || [],
        hasConfiguredGroups: (
          (settings.oidcAdminGroups && settings.oidcAdminGroups.length > 0) ||
          (settings.oidcPowerUserGroups && settings.oidcPowerUserGroups.length > 0) ||
          (settings.oidcUserGroups && settings.oidcUserGroups.length > 0)
        )
      },
      debug: {
        normalizedTestGroups: testGroups.map((g: string) => g.toLowerCase().trim().replace(/\s+/g, '')),
        normalizedAdminGroups: (settings.oidcAdminGroups || []).map((g: string) => g.toLowerCase().trim().replace(/\s+/g, '')),
        normalizedPowerUserGroups: (settings.oidcPowerUserGroups || []).map((g: string) => g.toLowerCase().trim().replace(/\s+/g, '')),
        normalizedUserGroups: (settings.oidcUserGroups || []).map((g: string) => g.toLowerCase().trim().replace(/\s+/g, '')),
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    authLogger.error('DEBUG endpoint error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Debug endpoint error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const settings = getAuthSettings()
    
    return NextResponse.json({
      message: 'Group Mapping Configuration',
      configuration: {
        adminGroups: settings.oidcAdminGroups || [],
        powerUserGroups: settings.oidcPowerUserGroups || [],
        userGroups: settings.oidcUserGroups || [],
        hasConfiguredGroups: (
          (settings.oidcAdminGroups && settings.oidcAdminGroups.length > 0) ||
          (settings.oidcPowerUserGroups && settings.oidcPowerUserGroups.length > 0) ||
          (settings.oidcUserGroups && settings.oidcUserGroups.length > 0)
        )
      },
      instructions: 'POST with { "testGroups": ["group1", "group2"] } to test mapping'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get configuration', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
