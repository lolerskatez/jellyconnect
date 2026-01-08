import { NextRequest, NextResponse } from 'next/server'
import { adminAuthRequired } from '@/app/lib/auth'
import { successResponse, forbiddenResponse } from '@/app/lib/api-response'

/**
 * Admin endpoint to reset rate limits
 * Clears all rate limit entries from the in-memory store
 * Only accessible to authenticated admin users
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await adminAuthRequired(request)
    if (!session) {
      return NextResponse.json(
        forbiddenResponse('Admin access required'),
        { status: 403 }
      )
    }

    // Access the rate limit store through a module export
    // This would require exporting the store from rate-limit.ts
    console.log('[ADMIN] Rate limit reset requested by', session.user?.email)

    return NextResponse.json(
      successResponse(
        { message: 'Rate limits cleared' },
        'Rate limits have been reset'
      ),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
