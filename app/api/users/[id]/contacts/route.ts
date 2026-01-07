import { NextRequest, NextResponse } from 'next/server';
import { getUserContacts, updateUser, createUser } from '../../../../lib/db/queries';
import { usersLogger } from '@/app/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const contacts = getUserContacts(id);

    // getUserContacts now always returns an object, even for non-existent users
    return NextResponse.json(contacts);
  } catch (error) {
    usersLogger.error('Error fetching contacts', { userId: id, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch user contacts' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { displayName, email, discordUsername } = await request.json();

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate Discord username format if provided (can be username or username#discriminator)
    if (discordUsername && !/^.{2,32}(#\d{4})?$/.test(discordUsername)) {
      return NextResponse.json({ error: 'Invalid Discord username format' }, { status: 400 });
    }

    const updatedUser = updateUser(id, { displayName, email, discordUsername });
    if (!updatedUser) {
      // User doesn't exist in local database, create them
      createUser(id, id, email, discordUsername, displayName);
    }

    // Save the database immediately to persist changes
    const { saveDatabaseImmediate } = await import('../../../../lib/db/index');
    saveDatabaseImmediate();

    return NextResponse.json({ success: true });
  } catch (error) {
    usersLogger.error('Failed to update user contacts', { userId: id, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to update user contacts' }, { status: 500 });
  }
}