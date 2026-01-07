import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';
import { createUser, generateId } from '@/app/lib/db/queries';
import { createUserSchema } from '@/app/lib/validation';
import { usersLogger } from '@/app/lib/logger';

export async function GET() {
  try {
    const config = getConfig();

    if (!config.jellyfinUrl) {
      return NextResponse.json({ error: 'Jellyfin server URL not configured' }, { status: 500 });
    }

    if (!config.apiKey) {
      return NextResponse.json({ error: 'Jellyfin API key not configured' }, { status: 500 });
    }

    const usersRes = await fetch(`${config.jellyfinUrl}/Users`, {
      headers: { 'X-Emby-Token': config.apiKey }
    });

    if (!usersRes.ok) {
      usersLogger.error('Jellyfin API error fetching users', { status: usersRes.status, statusText: usersRes.statusText });
      return NextResponse.json({
        error: `Failed to fetch users from Jellyfin: ${usersRes.status} ${usersRes.statusText}`
      }, { status: 500 });
    }

    const users = await usersRes.json();
    
    // Add oidcProvider from database for each user
    try {
      const { getUserById } = await import('@/app/lib/db/queries');
      const usersWithOidc = users.map((user: any) => {
        const dbUser = getUserById(user.Id);
        if (dbUser?.oidcProvider) {
          user.oidcProvider = dbUser.oidcProvider;
        }
        return user;
      });
      return NextResponse.json(usersWithOidc);
    } catch (error) {
      usersLogger.warn('Could not fetch oidcProvider from database', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(users);
    }
  } catch (error) {
    usersLogger.error('Error fetching users', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({
      error: `Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = getConfig();
    const body = await request.json();

    // Validate input
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { name, password, email, discordUsername, displayName, inviteId } = validationResult.data;

    const newUserRes = await fetch(`${config.jellyfinUrl}/Users/New`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Emby-Token': config.apiKey },
      body: JSON.stringify({ Name: name, Password: password })
    });
    const newUser = await newUserRes.json();

    // Store user in our database
    if (newUser.Id) {
      try {
        createUser(newUser.Id, newUser.Id, email || undefined, discordUsername || undefined, displayName || undefined);

        // Record invite usage if inviteId was provided
        if (inviteId) {
          usersLogger.info('Recording invite usage', { inviteId, userId: newUser.Id });
          const { recordInviteUsage } = await import('@/app/lib/db/queries');
          const { saveDatabaseImmediate } = await import('@/app/lib/db');
          recordInviteUsage(generateId(), inviteId, newUser.Id);
          saveDatabaseImmediate();
          usersLogger.info('Invite usage recorded and saved');
        } else {
          usersLogger.info('No inviteId provided, skipping usage recording');
        }

        // Send welcome notification if contact info provided
        if (email || discordUsername) {
          const { sendWelcomeNotification } = await import('@/app/lib/notifications');
          await sendWelcomeNotification(newUser.Id, name);
        }
      } catch (dbError) {
        usersLogger.error('Failed to store user in database', { error: dbError instanceof Error ? dbError.message : String(dbError) });
        // Don't fail the request if DB storage fails
      }
    }

    return NextResponse.json(newUser);
  } catch (error) {
    usersLogger.error('Failed to create user', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}