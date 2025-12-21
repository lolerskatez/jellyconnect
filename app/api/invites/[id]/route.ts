import { NextRequest, NextResponse } from 'next/server';
import { getInviteUsages, getAllInvites } from '@/app/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const inviteId = params.id;

    if (inviteId) {
      // Get usages for a specific invite
      console.log('[Invite Details API] Fetching usages for inviteId:', inviteId);
      const usages = getInviteUsages(inviteId);
      console.log('[Invite Details API] Found usages:', usages.length);
      return NextResponse.json(usages);
    } else {
      // Get all invites (including inactive ones)
      const invites = getAllInvites();
      return NextResponse.json(invites);
    }
  } catch (error) {
    console.error('Failed to fetch invite details:', error);
    return NextResponse.json({ error: 'Failed to fetch invite details' }, { status: 500 });
  }
}