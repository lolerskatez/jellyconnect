import { NextRequest, NextResponse } from 'next/server';
import { getInviteByCode, incrementInviteUsage, recordInviteUsage, generateId } from '@/app/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    console.log('[Invite Validate] Looking for code:', code);
    const invite = getInviteByCode(code);
    console.log('[Invite Validate] Found invite:', invite);

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
    console.error('Failed to validate invite:', error);
    return NextResponse.json({ error: 'Failed to validate invite' }, { status: 500 });
  }
}