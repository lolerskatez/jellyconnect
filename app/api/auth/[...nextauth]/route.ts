import { handlers } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

// Wrap handlers to log errors and details
export async function GET(req: NextRequest, context: any) {
  try {
    console.log('[AUTH ROUTE] GET request:', req.url)
    console.log('[AUTH ROUTE] Headers:', {
      host: req.headers.get('host'),
      'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
      'x-forwarded-host': req.headers.get('x-forwarded-host'),
    })
    
    // Extract the action from the URL
    const url = new URL(req.url)
    const pathname = url.pathname
    console.log('[AUTH ROUTE] Pathname:', pathname)
    
    const response = await handlers.GET(req, context)
    console.log('[AUTH ROUTE] Response status:', response.status)
    console.log('[AUTH ROUTE] Response headers:', {
      location: response.headers.get('location'),
      'content-type': response.headers.get('content-type'),
    })
    
    // Log response body for error responses
    if (response.status >= 300 && response.status < 400) {
      try {
        const location = response.headers.get('location')
        if (location && location.includes('error=')) {
          console.log('[AUTH ROUTE] Error response - redirecting to:', location)
        }
      } catch (e) {
        // Ignore
      }
    }
    
    return response
  } catch (error) {
    console.error('[AUTH ROUTE] GET Error:', error)
    throw error
  }
}

export async function POST(req: NextRequest, context: any) {
  try {
    console.log('[AUTH ROUTE] POST request:', req.url)
    const response = await handlers.POST(req, context)
    console.log('[AUTH ROUTE] Response status:', response.status)
    return response
  } catch (error) {
    console.error('[AUTH ROUTE] POST Error:', error)
    throw error
  }
}
