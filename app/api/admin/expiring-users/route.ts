import { NextRequest, NextResponse } from 'next/server';
import { getExpiringUsers } from '../../../lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const expiringUsers = getExpiringUsers(days);

    return NextResponse.json(expiringUsers);
  } catch (error) {
    console.error('Error fetching expiring users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}