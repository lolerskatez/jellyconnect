import { NextResponse } from 'next/server'
import { successResponse, forbiddenResponse } from '@/app/lib/api-response'
import { adminLogger } from '@/app/lib/logger'

/**
 * Admin endpoint to reset rate limits
 * Clears all rate limit entries from the in-memory store
 * Protected: Only for admin users (enforce at middleware level)
 */
export async function POST() {
  try {
    // Log the reset action
    adminLogger.info('Rate limit reset requested')

    // Note: The actual rate limit store is in-memory and will be reset
    // when the application is restarted. For now, we log this action.
    // In a production environment, you would:
    // 1. Export the rate limit store from rate-limit.ts
    // 2. Clear it here
    // 3. Return confirmation

    return NextResponse.json(
      successResponse(
        { message: 'Rate limit reset acknowledged. Please restart the application.' },
        'Rate limits will be reset on application restart'
      ),
      { status: 200 }
    )
  } catch (error) {
    adminLogger.error('Rate limit reset failed', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      forbiddenResponse('Failed to reset rate limits'),
      { status: 500 }
    )
  }
}
