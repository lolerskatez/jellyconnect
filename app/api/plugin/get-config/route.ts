import { NextResponse } from 'next/server'
import { pluginLogger } from '@/app/lib/logger'
import { successResponse } from '@/app/lib/api-response'
import { getConfig } from '@/app/lib/config'

/**
 * Returns plugin configuration from JellyConnect
 * Called by the plugin to retrieve OIDC settings without hardcoding them
 */
export async function GET() {
  try {
    const config = getConfig()

    pluginLogger.info('Retrieving plugin configuration')

    // Don't expose the full config, only what the plugin needs
    const pluginConfig = {
      jellyfinUrl: config.jellyfinUrl,
      apiKey: !!config.apiKey, // Don't return the actual key
      oidcEnabled: config.oidcEnabled || false,
      oidcProviderName: config.oidcProviderName,
      oidcDiscoveryUrl: config.oidcDiscoveryUrl,
      oidcIssuer: config.oidcIssuer,
      // Note: Don't expose client secret or other sensitive data
      autoCreateUser: config.enableRegistration !== false,
      roleClaim: 'oidcGroups', // Claim name for role/group information
    }

    return NextResponse.json(
      successResponse(pluginConfig, 'Configuration retrieved successfully'),
      { status: 200 }
    )
  } catch (error) {
    pluginLogger.error('Failed to retrieve configuration', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
