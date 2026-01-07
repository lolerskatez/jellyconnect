import { NextRequest, NextResponse } from 'next/server';
import { AccountExpiryManager } from '../../../lib/account-expiry';
import { adminLogger } from '@/app/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // This is an admin-only endpoint, but since we don't have authentication
    // in other endpoints, we'll follow the same pattern for now

    const manager = new AccountExpiryManager();
    await manager.triggerExpiryCheck();

    return NextResponse.json({
      success: true,
      message: 'Expiry check completed'
    });
  } catch (error) {
    adminLogger.error('Error triggering expiry check', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({
      error: 'Failed to trigger expiry check'
    }, { status: 500 });
  }
}