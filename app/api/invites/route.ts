import { NextRequest, NextResponse } from 'next/server';
import { createInvite, getActiveInvites, deleteInvite, reactivateInvite, updateInvite, generateId, generateInviteCode } from '@/app/lib/db/queries';
import { emailService } from '@/app/lib/email';
import { createInviteSchema } from '@/app/lib/validation';
import { invitesLogger } from '@/app/lib/logger';
import { successResponse, errorResponse, validationErrorResponse } from '@/app/lib/api-response';

export async function GET() {
  try {
    const invites = getActiveInvites();
    return NextResponse.json(
      successResponse(invites, 'Invites retrieved successfully'),
      { status: 200 }
    );
  } catch (error) {
    invitesLogger.error('Failed to fetch invites', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Failed to fetch invites', 'INVITES_FETCH_ERROR', 500),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = createInviteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        validationErrorResponse(validationResult.error.issues),
        { status: 400 }
      );
    }

    const { profile, maxUses, expiresAt, createdBy, email } = validationResult.data;

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
        invitesLogger.info('Invite email sent', { email });
      } catch (emailError) {
        invitesLogger.error('Failed to send invite email', { email, error: emailError instanceof Error ? emailError.message : String(emailError) });
        // Don't fail the invite creation if email fails
      }
    }

    return NextResponse.json(
      successResponse({
        id,
        code,
        profile,
        maxUses,
        expiresAt,
        email,
        createdBy
      }, 'Invite created successfully'),
      { status: 201 }
    );
  } catch (error) {
    invitesLogger.error('Failed to create invite', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Failed to create invite', 'INVITE_CREATE_ERROR', 500),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  try {
    if (!id) {
      return NextResponse.json(
        validationErrorResponse([{ path: 'id', message: 'Invite ID is required' }]),
        { status: 400 }
      );
    }

    deleteInvite(id);
    return NextResponse.json(
      successResponse({}, 'Invite deleted successfully'),
      { status: 200 }
    );
  } catch (error) {
    invitesLogger.error('Failed to delete invite', { inviteId: id, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Failed to delete invite', 'INVITE_DELETE_ERROR', 500),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const { id, action, updates } = await request.json();

  try {
    if (!id) {
      return NextResponse.json(
        validationErrorResponse([{ path: 'id', message: 'Invite ID is required' }]),
        { status: 400 }
      );
    }

    if (action === 'reactivate') {
      reactivateInvite(id);
      return NextResponse.json(
        successResponse({}, 'Invite reactivated successfully'),
        { status: 200 }
      );
    } else if (action === 'update' && updates) {
      updateInvite(id, updates);
      return NextResponse.json(
        successResponse({}, 'Invite updated successfully'),
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        validationErrorResponse([{ path: 'action', message: 'Invalid action or missing updates' }]),
        { status: 400 }
      );
    }
  } catch (error) {
    invitesLogger.error('Failed to update invite', { inviteId: id, action, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Failed to update invite', 'INVITE_UPDATE_ERROR', 500),
      { status: 500 }
    );
  }
}