import { NextRequest, NextResponse } from 'next/server';
import { accountExpiryManager } from '../../../lib/account-expiry';

export async function POST(request: NextRequest) {
  try {
    // This is an admin-only endpoint, but since we don't have authentication
    // in other endpoints, we'll follow the same pattern for now

    await accountExpiryManager.triggerExpiryCheck();

    return NextResponse.json({
      success: true,
      message: 'Expiry check completed'
    });
  } catch (error) {
    console.error('Error triggering expiry check:', error);
    return NextResponse.json({
      error: 'Failed to trigger expiry check'
    }, { status: 500 });
  }
}