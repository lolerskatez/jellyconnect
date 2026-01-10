import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'
import { setupLogger } from '@/app/lib/logger'

/**
 * COMPREHENSIVE API KEY VALIDATOR
 * Tests API key validity against Jellyfin requirements
 * Provides specific feedback about what's wrong
 * 
 * Usage:
 * GET /api/debug/validate-api-key
 * 
 * Returns detailed analysis of API key issues
 */

export async function GET(request: NextRequest) {
  try {
    const config = getConfig()
    
    const result: any = {
      timestamp: new Date().toISOString(),
      apiKey: {
        configured: !!config.apiKey,
        length: config.apiKey?.length || 0,
        prefix: config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'NONE',
        format: analyzeKeyFormat(config.apiKey)
      },
      server: {
        url: config.jellyfinUrl || 'NOT CONFIGURED',
        reachable: false,
        responding: false
      },
      validation: {
        formatValid: false,
        serverReachable: false,
        authenticationValid: false,
        overallValid: false
      },
      tests: [],
      issues: [],
      recommendations: []
    }

    // Step 1: Validate API key format
    const formatValidation = validateApiKeyFormat(config.apiKey)
    result.apiKey.format = formatValidation
    result.validation.formatValid = formatValidation.isValid
    if (!formatValidation.isValid) {
      result.issues.push(...formatValidation.issues)
    }

    // Step 2: Check server reachability
    if (config.jellyfinUrl && config.apiKey) {
      try {
        const reachabilityTest = await testServerReachability(config.jellyfinUrl)
        result.server.reachable = reachabilityTest.success
        result.validation.serverReachable = reachabilityTest.success
        result.tests.push({
          name: 'Server Reachability',
          passed: reachabilityTest.success,
          time: reachabilityTest.responseTime,
          message: reachabilityTest.message
        })
        
        if (!reachabilityTest.success) {
          result.issues.push(reachabilityTest.error || 'Server not reachable')
        }

        // Step 3: Test authentication if server is reachable
        if (reachabilityTest.success) {
          const authTest = await testApiKeyAuthentication(config.jellyfinUrl, config.apiKey)
          result.server.responding = authTest.responded
          result.validation.authenticationValid = authTest.authenticated
          result.tests.push({
            name: 'API Key Authentication',
            passed: authTest.authenticated,
            httpStatus: authTest.httpStatus,
            time: authTest.responseTime,
            message: authTest.message
          })

          if (!authTest.authenticated) {
            result.issues.push(authTest.error || 'Authentication failed')
            if (authTest.httpStatus === 401) {
              result.issues.push('HTTP 401: Invalid or revoked API key')
            } else if (authTest.httpStatus === 403) {
              result.issues.push('HTTP 403: Key exists but lacks permissions')
            }
          }

          // Step 4: Additional diagnostic tests
          if (authTest.authenticated) {
            result.tests.push({
              name: 'Verification',
              passed: true,
              message: 'API key is valid and functional'
            })
          } else if (authTest.httpStatus === 401) {
            // Try alternative endpoints
            const altTest = await testAlternativeEndpoint(config.jellyfinUrl, config.apiKey)
            result.tests.push({
              name: 'Alternative Endpoint Test',
              passed: altTest.success,
              message: altTest.message
            })

            if (!altTest.success) {
              result.recommendations.push('API key appears to be completely invalid or revoked')
              result.recommendations.push('Go to Jellyfin Admin → API Keys')
              result.recommendations.push('Delete the old key and create a new one')
              result.recommendations.push('Copy the full 40-character key without truncation')
            }
          }
        }
      } catch (error) {
        result.issues.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Determine overall validity
    result.validation.overallValid = 
      result.validation.formatValid &&
      result.validation.serverReachable &&
      result.validation.authenticationValid

    // Generate recommendations based on findings
    generateRecommendations(result)

    const statusCode = result.validation.overallValid ? 200 : 400
    return NextResponse.json(result, { status: statusCode })

  } catch (error) {
    setupLogger.error('API key validation endpoint error', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return NextResponse.json({
      error: 'Validation endpoint error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

function analyzeKeyFormat(apiKey: string | undefined): any {
  if (!apiKey) {
    return {
      isValid: false,
      issues: ['API key not configured']
    }
  }

  const issues: string[] = []
  const warnings: string[] = []

  // Check length
  if (apiKey.length < 40) {
    issues.push(`API key is too short (${apiKey.length} chars, need 40+)`)
  } else if (apiKey.length > 50) {
    issues.push(`API key is too long (${apiKey.length} chars, should be ~40)`)
  }

  // Check for whitespace
  if (apiKey !== apiKey.trim()) {
    issues.push('API key has leading or trailing whitespace')
  }

  // Check for invalid characters
  if (!/^[a-fA-F0-9]+$/.test(apiKey.trim())) {
    issues.push('API key contains non-hexadecimal characters (should be 0-9, a-f only)')
  }

  // Check for common copy-paste issues
  if (apiKey.includes('-') || apiKey.includes('_') || apiKey.includes(' ')) {
    issues.push('API key contains dashes, underscores, or spaces (remove them)')
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    length: apiKey.length,
    format: 'Appears to be hexadecimal'
  }
}

function validateApiKeyFormat(apiKey: string | undefined): any {
  return analyzeKeyFormat(apiKey)
}

async function testServerReachability(url: string): Promise<any> {
  try {
    const start = Date.now()
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    const time = Date.now() - start

    return {
      success: true,
      responseTime: `${time}ms`,
      message: `Server responded with HTTP ${response.status}`,
      httpStatus: response.status
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    let errorMsg = message

    if (message.includes('ECONNREFUSED')) {
      errorMsg = 'Connection refused - Jellyfin server may not be running'
    } else if (message.includes('ENOTFOUND')) {
      errorMsg = 'Cannot resolve hostname - Check the URL is correct'
    } else if (message.includes('timeout')) {
      errorMsg = 'Connection timeout - Server is unreachable or very slow'
    }

    return {
      success: false,
      error: errorMsg,
      message: `Server unreachable: ${errorMsg}`
    }
  }
}

async function testApiKeyAuthentication(url: string, apiKey: string): Promise<any> {
  try {
    const start = Date.now()
    const response = await fetch(`${url}/System/Info`, {
      method: 'GET',
      headers: {
        'X-Emby-Token': apiKey,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    })
    const time = Date.now() - start

    if (response.ok) {
      const data = await response.json()
      return {
        authenticated: true,
        responded: true,
        httpStatus: response.status,
        responseTime: `${time}ms`,
        message: `Authentication successful - Jellyfin ${data.Version} (${data.ServerName})`,
        serverInfo: data
      }
    } else {
      const errorBody = await response.text()
      return {
        authenticated: false,
        responded: true,
        httpStatus: response.status,
        responseTime: `${time}ms`,
        error: `Server responded with HTTP ${response.status}`,
        message: `Authentication failed (HTTP ${response.status})`,
        serverResponse: errorBody.substring(0, 200)
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      authenticated: false,
      responded: false,
      error: message,
      message: `Failed to test authentication: ${message}`
    }
  }
}

async function testAlternativeEndpoint(url: string, apiKey: string): Promise<any> {
  try {
    // Try /Items endpoint as an alternative
    const response = await fetch(`${url}/Items?limit=1`, {
      method: 'GET',
      headers: {
        'X-Emby-Token': apiKey
      },
      signal: AbortSignal.timeout(5000)
    })

    return {
      success: response.ok,
      httpStatus: response.status,
      message: response.ok ? 'Alternative endpoint accessible' : `HTTP ${response.status}`
    }
  } catch (error) {
    return {
      success: false,
      message: 'Alternative endpoint also failed'
    }
  }
}

function generateRecommendations(result: any) {
  const rec = result.recommendations

  if (!result.validation.formatValid) {
    rec.push('Fix API key format issues (see details above)')
  }

  if (!result.validation.serverReachable && result.apiKey.configured) {
    rec.push('Verify Jellyfin server is running and accessible at: ' + result.server.url)
    rec.push('Check firewall rules for port 8096')
    rec.push('Verify network connectivity between this application and Jellyfin')
  }

  if (!result.validation.authenticationValid && result.validation.serverReachable && result.validation.formatValid) {
    rec.push('API key is invalid or has been revoked')
    rec.push('1. Log into Jellyfin as admin')
    rec.push('2. Go to Dashboard → Settings → API Keys')
    rec.push('3. Delete any old "JellyConnect" keys')
    rec.push('4. Create a new API key')
    rec.push('5. Copy the full 40-character key')
    rec.push('6. Update JellyConnect configuration with the new key')
  }

  if (result.validation.overallValid) {
    rec.push('✅ API key is valid and operational')
  }
}
