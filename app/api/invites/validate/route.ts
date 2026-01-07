import { NextRequest, NextResponse } from 'next/server';
import { getInviteByCode, incrementInviteUsage, recordInviteUsage, generateId } from '@/app/lib/db/queries';
import { invitesLogger } from '@/app/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    invitesLogger.info('Validating invite code', { code, found: !!invite })
    const invite = getInviteByCode(code);

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 });
    }

    // Check if invite has expired
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 400 });
    }

    // Check usage limit
    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      return NextResponse.json({ error: 'Invite code has reached maximum uses' }, { status: 400 });
    }

    // If userId provided and not temporary, record the usage
    if (userId && userId !== 'temp') {
      incrementInviteUsage(invite.id);
      recordInviteUsage(generateId(), invite.id, userId);
    }

    return NextResponse.json({
      valid: true,
      profile: invite.profile,
      inviteId: invite.id,
      email: invite.email
    });
  } catch (error) {
    invitesLogger.error('Failed to validate invite', { code, userId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to validate invite' }, { status: 500 });
  }
}