import { NextRequest, NextResponse } from 'next/server';
import { createInvite, getActiveInvites, deleteInvite, reactivateInvite, updateInvite, generateId, generateInviteCode } from '@/app/lib/db/queries';
import { emailService } from '@/app/lib/email';

export async function GET() {
  try {
    const invites = getActiveInvites();
    return NextResponse.json(invites);
  } catch (error) {
    console.error('Failed to fetch invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, maxUses, expiresAt, createdBy, email } = await request.json();

    if (!profile || !createdBy) {
      return NextResponse.json({ error: 'Profile and createdBy are required' }, { status: 400 });
    }

    const id = generateId();
    const code = generateInviteCode();

    createInvite(id, code, createdBy, profile, maxUses, expiresAt, email);

    // Send invite email if email is provided
    if (email) {
      const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/register?invite=${code}`;
      const subject = 'You\'ve been invited to join JellyConnect';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to JellyConnect!</h2>
          <p>You've been invited to join our JellyConnect server.</p>
          <p><strong>Your invite code:</strong> ${code}</p>
          <p>Click the link below to register:</p>
          <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Accept Invitation</a>
          <p>If the button doesn't work, you can copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 3px;">${inviteUrl}</p>
          <p>This invite will give you access as a <strong>${profile}</strong> user.</p>
          ${maxUses ? `<p>This invite can be used <strong>${maxUses}</strong> time(s).</p>` : '<p>This invite has unlimited uses.</p>'}
          ${expiresAt ? `<p>This invite expires on <strong>${new Date(expiresAt).toLocaleString()}</strong>.</p>` : '<p>This invite does not expire.</p>'}
          <p>If you have any questions, please contact your administrator.</p>
        </div>
      `;

      try {
        await emailService.sendEmail(email, subject, html);
        console.log(`Invite email sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send invite email:', emailError);
        // Don't fail the invite creation if email fails
      }
    }

    return NextResponse.json({
      id,
      code,
      profile,
      maxUses,
      expiresAt,
      email,
      createdBy
    });
  } catch (error) {
    console.error('Failed to create invite:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
    }

    deleteInvite(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete invite:', error);
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, action, updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
    }

    if (action === 'reactivate') {
      reactivateInvite(id);
      return NextResponse.json({ success: true });
    } else if (action === 'update' && updates) {
      updateInvite(id, updates);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action or missing updates' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to update invite:', error);
    return NextResponse.json({ error: 'Failed to update invite' }, { status: 500 });
  }
}