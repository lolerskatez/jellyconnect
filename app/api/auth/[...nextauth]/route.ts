import { handlers } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { apiLogger } from '@/app/lib/logger'

// Wrap handlers to log errors and details
export async function GET(req: NextRequest, context: any) {
  const startTime = Date.now()
  try {
    const url = new URL(req.url)
    const pathname = url.pathname

    apiLogger.debug('Auth GET request', {
      url: req.url,
      pathname,
      headers: {
        host: req.headers.get('host'),
        'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
        'x-forwarded-host': req.headers.get('x-forwarded-host'),
      }
    })

    const response = await handlers.GET(req, context)

    const duration = Date.now() - startTime
    logApiRequest('GET', pathname, response.status, duration)

    // Log response details for redirects
    if (response.status >= 300 && response.status < 400) {
      try {
        const location = response.headers.get('location')
        if (location && location.includes('error=')) {
          apiLogger.warn('Auth error redirect', { location })
        }
      } catch (e) {
        // Ignore
      }
    }

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    apiLogger.error('Auth GET error', { error: error instanceof Error ? error.message : String(error), duration })
    throw error
  }
}

export async function POST(req: NextRequest, context: any) {
  const startTime = Date.now()
  try {
    apiLogger.debug('Auth POST request', { url: req.url })

    const response = await handlers.POST(req, context)

    const duration = Date.now() - startTime
    const url = new URL(req.url)
    logApiRequest('POST', url.pathname, response.status, duration)

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    apiLogger.error('Auth POST error', { error: error instanceof Error ? error.message : String(error), duration })
    throw error
  }
}
