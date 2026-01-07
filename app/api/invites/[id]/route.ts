import { NextRequest, NextResponse } from 'next/server';
import { getInviteUsages, getAllInvites } from '@/app/lib/db/queries';
import { invitesLogger } from '@/app/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const inviteId = params.id;

    if (inviteId) {
      // Get usages for a specific invite
      invitesLogger.info('Fetching usages for invite', { inviteId });
      const usages = getInviteUsages(inviteId);
      invitesLogger.info('Found invite usages', { inviteId, count: usages.length });
      return NextResponse.json(usages);
    } else {
      // Get all invites (including inactive ones)
      const invites = getAllInvites();
      return NextResponse.json(invites);
    }
  } catch (error) {
    invitesLogger.error('Failed to fetch invite details', { inviteId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch invite details' }, { status: 500 });
  }
}