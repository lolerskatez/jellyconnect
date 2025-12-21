import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser } from '../../../../lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json({ expiresAt: null });
    }

    return NextResponse.json({ expiresAt: user.expiresAt || null });
  } catch (error) {
    console.error('Error fetching user expiry:', error);
    return NextResponse.json({ error: 'Failed to fetch user expiry' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { expiresAt } = await request.json();

    // Validate expiry date if provided
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 });
      }
    }

    // Get current user to preserve other data
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user with new expiry date
    const updatedUser = {
      ...user,
      expiresAt: expiresAt || undefined,
      expiryWarningSent: expiresAt ? false : user.expiryWarningSent, // Reset warning flag if expiry changed
      updatedAt: new Date().toISOString()
    };

    await updateUser(id, updatedUser);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user expiry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}