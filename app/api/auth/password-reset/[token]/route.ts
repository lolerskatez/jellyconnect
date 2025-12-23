import { NextRequest, NextResponse } from 'next/server';
import { getPasswordResetToken, markPasswordResetTokenUsed, getUserById } from '@/app/lib/db/queries';
import { getConfig } from '@/app/lib/config';

/**
 * Validate and use a password reset token
 * GET /api/auth/password-reset/[token] - Validate token
 * POST /api/auth/password-reset/[token] - Use token to reset password
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const resetToken = getPasswordResetToken(token);
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expiresAt);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      );
    }

    // Get user information
    const user = getUserById(resetToken.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error validating password reset token:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const config = getConfig();
    const { token } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const resetToken = getPasswordResetToken(token);
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expiresAt);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      );
    }

    // Get user information
    const user = getUserById(resetToken.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get Jellyfin user to find username
    const jellyfinUserRes = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}`, {
      headers: { 'X-Emby-Token': config.apiKey }
    });

    if (!jellyfinUserRes.ok) {
      return NextResponse.json(
        { error: 'Failed to get user from Jellyfin' },
        { status: 500 }
      );
    }

    const jellyfinUser = await jellyfinUserRes.json();

    // Update password in Jellyfin
    const updateRes = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}/Password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': config.apiKey
      },
      body: JSON.stringify({
        NewPw: newPassword,
        ResetPassword: true
      })
    });

    if (!updateRes.ok && updateRes.status !== 204) {
      const errorText = await updateRes.text();
      console.error('Password update failed:', updateRes.status, errorText);
      return NextResponse.json(
        { error: 'Failed to update password in Jellyfin' },
        { status: 500 }
      );
    }

    // Mark token as used
    markPasswordResetTokenUsed(token);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}