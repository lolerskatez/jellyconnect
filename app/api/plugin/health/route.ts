import { NextResponse } from 'next/server'
import { pluginLogger } from '@/app/lib/logger'
import { successResponse } from '@/app/lib/api-response'
import { getConfig } from '@/app/lib/config'

/**
 * Health check endpoint for Jellyfin OIDC Plugin
 * Verifies that the JellyConnect API is available and Jellyfin is configured
 */
export async function GET() {
  try {
    const config = getConfig()
    const jellyfinConnected = !!(config.jellyfinUrl && config.apiKey)

    pluginLogger.info('Health check request', { jellyfinConnected })

    return NextResponse.json(
      successResponse(
        {
          status: 'ok',
          version: '1.0.0',
          jellyfinConnected,
          timestamp: new Date().toISOString()
        },
        'Health check successful'
      ),
      { status: 200 }
    )
  } catch (error) {
    pluginLogger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
