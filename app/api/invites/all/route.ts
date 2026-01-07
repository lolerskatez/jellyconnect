import { NextResponse } from 'next/server';
import { getAllInvites } from '@/app/lib/db/queries';
import { invitesLogger } from '@/app/lib/logger';

export async function GET() {
  try {
    const invites = getAllInvites();
    return NextResponse.json(invites);
  } catch (error) {
    invitesLogger.error('Failed to fetch all invites', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch all invites' }, { status: 500 });
  }
}