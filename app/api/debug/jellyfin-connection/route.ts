import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'
import { setupLogger } from '@/app/lib/logger'

/**
 * DEBUG ENDPOINT - Test Jellyfin API Connection
 * Tests connectivity and authentication with Jellyfin server
 * 
 * Example usage:
 * GET /api/debug/jellyfin-connection
 */

export async function GET(request: NextRequest) {
  try {
    const config = getConfig()
    
    const result: any = {
      timestamp: new Date().toISOString(),
      configuration: {
        jellyfinUrl: config.jellyfinUrl || 'NOT CONFIGURED',
        hasApiKey: !!config.apiKey,
        apiKeyLength: config.apiKey?.length || 0,
        apiKeyPrefix: config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'NONE'
      },
      tests: []
    }

    // Test 1: Check if URL is configured
    if (!config.jellyfinUrl) {
      result.tests.push({
        name: 'Configuration Check',
        status: 'FAILED',
        error: 'Jellyfin URL is not configured',
        severity: 'CRITICAL'
      })
      return NextResponse.json(result, { status: 400 })
    }

    result.tests.push({
      name: 'Configuration Check',
      status: 'OK',
      message: `URL configured: ${config.jellyfinUrl}`
    })

    // Test 2: Check if API key is configured
    if (!config.apiKey) {
      result.tests.push({
        name: 'API Key Configuration',
        status: 'FAILED',
        error: 'API key is not configured',
        severity: 'CRITICAL'
      })
      return NextResponse.json(result, { status: 400 })
    }

    result.tests.push({
      name: 'API Key Configuration',
      status: 'OK',
      message: `API key is configured (${config.apiKey.length} chars)`
    })

    // Test 3: Test basic connectivity
    result.tests.push({
      name: 'Network Connectivity',
      status: 'TESTING',
      message: 'Attempting to connect to Jellyfin server...'
    })

    let connectivityTest: any = { name: 'Network Connectivity' }
    try {
      const connectStart = Date.now()
      const response = await fetch(`${config.jellyfinUrl}/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'JellyConnect-Debug/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      const connectEnd = Date.now()
      
      connectivityTest.responseTime = `${connectEnd - connectStart}ms`
      connectivityTest.httpStatus = response.status
      
      if (response.ok || response.status === 200) {
        connectivityTest.status = 'OK'
        connectivityTest.message = `Successfully connected (HTTP ${response.status})`
      } else {
        connectivityTest.status = 'WARNING'
        connectivityTest.message = `Connected but received HTTP ${response.status}`
      }
    } catch (error) {
      connectivityTest.status = 'FAILED'
      connectivityTest.error = error instanceof Error ? error.message : String(error)
      connectivityTest.severity = 'CRITICAL'
      
      // Check if it's a network error
      if (connectivityTest.error.includes('ECONNREFUSED')) {
        connectivityTest.hint = 'Connection refused - Jellyfin server may not be running or URL is incorrect'
      } else if (connectivityTest.error.includes('ENOTFOUND') || connectivityTest.error.includes('getaddrinfo')) {
        connectivityTest.hint = 'DNS resolution failed - Check if the hostname is correct'
      } else if (connectivityTest.error.includes('timeout')) {
        connectivityTest.hint = 'Connection timeout - Server may be unreachable or very slow'
      }
    }
    result.tests.push(connectivityTest)

    // Test 4: Test API authentication
    result.tests.push({
      name: 'API Authentication',
      status: 'TESTING',
      message: 'Testing API key authentication...'
    })

    let authTest: any = { name: 'API Authentication' }
    try {
      const authStart = Date.now()
      const response = await fetch(`${config.jellyfinUrl}/System/Info`, {
        method: 'GET',
        headers: {
          'X-Emby-Token': config.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'JellyConnect-Debug/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      const authEnd = Date.now()

      authTest.responseTime = `${authEnd - authStart}ms`
      authTest.httpStatus = response.status

      if (response.ok) {
        const data = await response.json()
        authTest.status = 'OK'
        authTest.message = 'API key authentication successful'
        authTest.serverInfo = {
          serverName: data.ServerName || 'Unknown',
          version: data.Version || 'Unknown',
          osName: data.OperatingSystem || 'Unknown'
        }
      } else if (response.status === 401 || response.status === 403) {
        authTest.status = 'FAILED'
        authTest.error = `Authentication failed (HTTP ${response.status})`
        authTest.severity = 'CRITICAL'
        authTest.hint = 'API key is invalid or has been revoked. Please generate a new API key.'
        authTest.debugging = {
          apiKeyLength: config.apiKey?.length || 0,
          apiKeyPrefix: config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'NONE',
          headerSent: 'X-Emby-Token: [' + (config.apiKey?.length || 0) + ' chars]'
        }
        const errorBody = await response.text()
        authTest.serverError = errorBody
      } else {
        authTest.status = 'WARNING'
        authTest.message = `Received HTTP ${response.status} from API`
        const errorBody = await response.text()
        authTest.serverError = errorBody
      }
    } catch (error) {
      authTest.status = 'FAILED'
      authTest.error = error instanceof Error ? error.message : String(error)
      authTest.severity = 'CRITICAL'
      authTest.hint = 'Failed to communicate with API - Check network and Jellyfin status'
    }
    result.tests.push(authTest)

    // Test 5: Test user list endpoint
    result.tests.push({
      name: 'User List Endpoint',
      status: 'TESTING',
      message: 'Testing /Users endpoint...'
    })

    let usersTest: any = { name: 'User List Endpoint' }
    try {
      const usersStart = Date.now()
      const response = await fetch(`${config.jellyfinUrl}/Users`, {
        method: 'GET',
        headers: {
          'X-Emby-Token': config.apiKey,
          'User-Agent': 'JellyConnect-Debug/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      const usersEnd = Date.now()

      usersTest.responseTime = `${usersEnd - usersStart}ms`
      usersTest.httpStatus = response.status

      if (response.ok) {
        const users = await response.json()
        usersTest.status = 'OK'
        usersTest.message = `Successfully fetched ${users.length} users`
        usersTest.userCount = users.length
      } else {
        usersTest.status = 'FAILED'
        usersTest.error = `HTTP ${response.status}`
        usersTest.severity = 'HIGH'
        const errorBody = await response.text()
        usersTest.serverError = errorBody
      }
    } catch (error) {
      usersTest.status = 'FAILED'
      usersTest.error = error instanceof Error ? error.message : String(error)
      usersTest.severity = 'HIGH'
    }
    result.tests.push(usersTest)

    // Summary
    const failedTests = result.tests.filter((t: any) => t.status === 'FAILED')
    const criticalTests = result.tests.filter((t: any) => t.severity === 'CRITICAL')

    result.summary = {
      totalTests: result.tests.length,
      passed: result.tests.filter((t: any) => t.status === 'OK').length,
      failed: failedTests.length,
      warnings: result.tests.filter((t: any) => t.status === 'WARNING').length,
      overallStatus: criticalTests.length > 0 ? 'FAILED' : failedTests.length > 0 ? 'PARTIAL' : 'OK',
      recommendations: generateRecommendations(result.tests)
    }

    setupLogger.info('Jellyfin connection debug completed', { 
      overallStatus: result.summary.overallStatus,
      passed: result.summary.passed,
      failed: result.summary.failed
    })

    const httpStatus = criticalTests.length > 0 ? 500 : 200
    return NextResponse.json(result, { status: httpStatus })

  } catch (error) {
    setupLogger.error('Jellyfin debug endpoint error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

function generateRecommendations(tests: any[]): string[] {
  const recommendations: string[] = []
  
  tests.forEach(test => {
    if (test.status === 'FAILED') {
      if (test.name === 'Network Connectivity') {
        if (test.error?.includes('ECONNREFUSED')) {
          recommendations.push('Verify Jellyfin server is running and accessible at the configured URL')
        } else if (test.error?.includes('ENOTFOUND')) {
          recommendations.push('Verify the Jellyfin hostname/IP address is correct and resolvable')
        } else if (test.error?.includes('timeout')) {
          recommendations.push('Check network connectivity to the Jellyfin server, it may be offline or very slow')
        }
      } else if (test.name === 'API Authentication') {
        recommendations.push('Generate a new API key in Jellyfin Admin Dashboard > API Keys')
        recommendations.push('Ensure the API key has not been revoked or expired')
      } else if (test.name === 'User List Endpoint') {
        recommendations.push('Verify that the Jellyfin API is responding correctly')
        recommendations.push('Check Jellyfin server logs for any API errors')
      }
    }
  })

  if (recommendations.length === 0) {
    recommendations.push('All tests passed! Your Jellyfin connection is working correctly.')
  }

  return recommendations
}
