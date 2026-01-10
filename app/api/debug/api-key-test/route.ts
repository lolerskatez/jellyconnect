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
      configuration: {
        urlConfigured: !!config.jellyfinUrl,
        apiKeyConfigured: !!config.apiKey,
        jellyfinUrl: config.jellyfinUrl || 'NOT CONFIGURED',
        apiKeyLength: config.apiKey?.length || 0,
        apiKeyPrefix: config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'NONE'
      },
      valid: false,
      tests: [],
      error: null,
      serverInfo: null,
      debugging: {}
    }

    // Quick validation
    if (!config.jellyfinUrl || !config.apiKey) {
      result.error = 'API key or URL not configured'
      result.tests.push({
        name: 'Configuration',
        status: 'FAILED',
        error: result.error
      })
      return NextResponse.json(result, { status: 400 })
    }

    // Test 1: Try System/Info endpoint
    let test1Result: any = { name: 'System/Info with X-Emby-Token' }
    try {
      const response = await fetch(`${config.jellyfinUrl}/System/Info`, {
        method: 'GET',
        headers: {
          'X-Emby-Token': config.apiKey,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      })

      test1Result.status = response.ok ? 'PASSED' : 'FAILED'
      test1Result.httpStatus = response.status

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
        test1Result.message = 'Successfully authenticated with API key'
        test1Result.serverInfo = result.serverInfo
      } else if (response.status === 401 || response.status === 403) {
        test1Result.error = `Authentication failed (HTTP ${response.status})`
        test1Result.hint = 'API key may be invalid or revoked'
        const bodyText = await response.text()
        if (bodyText) {
          test1Result.serverResponse = bodyText.substring(0, 200)
        }
      } else {
        test1Result.error = `Server returned HTTP ${response.status}`
        test1Result.hint = 'Endpoint may not exist or server error'
        const bodyText = await response.text()
        if (bodyText) {
          test1Result.serverResponse = bodyText.substring(0, 200)
        }
      }
    } catch (error) {
      test1Result.status = 'FAILED'
      const message = error instanceof Error ? error.message : String(error)
      test1Result.error = message
      if (message.includes('ECONNREFUSED')) {
        test1Result.hint = 'Cannot connect to Jellyfin server'
      } else if (message.includes('timeout')) {
        test1Result.hint = 'Connection timeout'
      }
    }
    result.tests.push(test1Result)

    // Test 2: Alternative - try Items endpoint (different auth requirement)
    if (!result.valid) {
      let test2Result: any = { name: 'Items endpoint (alternative test)' }
      try {
        const response = await fetch(`${config.jellyfinUrl}/Items?limit=1`, {
          method: 'GET',
          headers: {
            'X-Emby-Token': config.apiKey,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        })

        test2Result.status = response.ok ? 'PASSED' : 'FAILED'
        test2Result.httpStatus = response.status

        if (response.ok) {
          result.valid = true
          test2Result.message = 'API key works on alternative endpoint'
        } else {
          test2Result.error = `HTTP ${response.status}`
        }
      } catch (error) {
        test2Result.status = 'FAILED'
        test2Result.error = error instanceof Error ? error.message : String(error)
      }
      result.tests.push(test2Result)
    }

    // Generate helpful error message
    if (!result.valid) {
      if (test1Result.error?.includes('401') || test1Result.error?.includes('403')) {
        result.error = 'API key authentication failed. Verify the key is valid and not revoked in Jellyfin admin panel.'
        result.debugging.suggestions = [
          'Check that the API key matches exactly (case-sensitive)',
          'Verify no leading/trailing whitespace in the key',
          'Try generating a new API key in Jellyfin Admin → API Keys',
          'Ensure API key has not been revoked or deleted'
        ]
      } else if (test1Result.error?.includes('ECONNREFUSED')) {
        result.error = 'Cannot connect to Jellyfin server. Check if it\'s running and the URL is correct.'
      } else if (test1Result.error?.includes('timeout')) {
        result.error = 'Connection timeout. Jellyfin server may be unreachable.'
      } else {
        result.error = test1Result.error || 'API key validation failed'
      }
    } else {
      result.error = null
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
