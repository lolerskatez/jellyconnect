import { NextRequest, NextResponse } from 'next/server';
import { getExpiringUsers } from '../../../lib/db/queries';
import { adminLogger } from '@/app/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const expiringUsers = getExpiringUsers(days);

    return NextResponse.json(expiringUsers);
  } catch (error) {
    adminLogger.error('Error fetching expiring users', { days, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}