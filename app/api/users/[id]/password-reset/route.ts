import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken, getUserById } from '@/app/lib/db/queries';
import { getConfig } from '@/app/lib/config';

/**
 * Generate a password reset token for a user (Admin only)
 * POST /api/users/[id]/password-reset
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Password reset API called');
    const config = getConfig();
    const { id } = await params;
    console.log('User ID:', id);
    const body = await request.json();
    const { expiresInHours = 24, createdBy } = body;

    // Check if user exists in our database
    const user = getUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Check if user exists in Jellyfin
    const jellyfinUserRes = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}`, {
      headers: { 'X-Emby-Token': config.apiKey }
    });

    if (!jellyfinUserRes.ok) {
      return NextResponse.json(
        { error: 'User not found in Jellyfin' },
        { status: 404 }
      );
    }

    const jellyfinUser = await jellyfinUserRes.json();

    // Check if user has password auth enabled (not SSO-only)
    if (user.oidcProvider && !jellyfinUser.HasPassword) {
      return NextResponse.json(
        { error: 'Cannot reset password for SSO-only user' },
        { status: 400 }
      );
    }

    // Generate the reset token
    const token = createPasswordResetToken(id, createdBy, expiresInHours);

    // Create the reset URL
    const resetUrl = `${request.nextUrl.origin}/auth/password-reset/${token}`;

    return NextResponse.json({
      success: true,
      token,
      resetUrl,
      expiresInHours,
      user: {
        id: user.id,
        displayName: user.displayName,
        jellyfinUsername: jellyfinUser.Name
      }
    });

  } catch (error) {
    console.error('Error generating password reset token:', error);
    return NextResponse.json(
      { error: 'Failed to generate password reset token' },
      { status: 500 }
    );
  }
}