import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'
import { setupLogger } from '@/app/lib/logger'

/**
 * QUICK API KEY TEST ENDPOINT
 * Simple validation of Jellyfin API key
 * 
 * Usage:
 * GET /api/debug/api-key-test
 * 
 * Response includes:
 * - Is API key configured?
 * - Is it valid?
 * - What Jellyfin version is running?
 * - Server name and OS
 */

export async function GET(request: NextRequest) {
  try {
    const config = getConfig()
    
    const result: any = {
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!config.apiKey,
      apiKeyLength: config.apiKey?.length || 0,
      urlConfigured: !!config.jellyfinUrl,
      valid: false,
      error: null,
      serverInfo: null
    }

    // Quick validation
    if (!config.jellyfinUrl || !config.apiKey) {
      result.error = 'API key or URL not configured'
      return NextResponse.json(result, { status: 400 })
    }

    try {
      const response = await fetch(`${config.jellyfinUrl}/System/Info`, {
        method: 'GET',
        headers: {
          'X-Emby-Token': config.apiKey
        },
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        const data = await response.json()
        result.valid = true
        result.serverInfo = {
          serverName: data.ServerName,
          version: data.Version,
          os: data.OperatingSystem,
          operatingSystem: data.OperatingSystem,
          systemUpdateLevel: data.SystemUpdateLevel
        }
      } else if (response.status === 401) {
        result.error = 'Invalid API key (HTTP 401). Generate a new key in Jellyfin admin panel.'
      } else if (response.status === 403) {
        result.error = 'API key lacks permissions (HTTP 403)'
      } else {
        result.error = `Server returned HTTP ${response.status}`
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('ECONNREFUSED')) {
        result.error = 'Cannot connect to Jellyfin server. Is it running and accessible at: ' + config.jellyfinUrl
      } else if (message.includes('ENOTFOUND')) {
        result.error = 'Cannot resolve hostname. Is the URL correct?'
      } else if (message.includes('timeout')) {
        result.error = 'Connection timeout. Server may be offline or slow.'
      } else {
        result.error = message
      }
    }

    const statusCode = result.valid ? 200 : 400
    return NextResponse.json(result, { status: statusCode })

  } catch (error) {
    return NextResponse.json({
      error: 'Test endpoint error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
