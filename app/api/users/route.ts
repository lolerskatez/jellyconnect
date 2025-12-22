import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';
import { createUser, generateId } from '@/app/lib/db/queries';

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
      console.error(`Jellyfin API error: ${usersRes.status} ${usersRes.statusText}`);
      return NextResponse.json({
        error: `Failed to fetch users from Jellyfin: ${usersRes.status} ${usersRes.statusText}`
      }, { status: 500 });
    }

    const users = await usersRes.json();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      error: `Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = getConfig();
    const { name, password, email, discordUsername, displayName, inviteId } = await request.json();

    console.log('[User Create] Received inviteId:', inviteId);

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

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
          console.log('[User Create] Recording invite usage for inviteId:', inviteId, 'userId:', newUser.Id);
          const { recordInviteUsage } = await import('@/app/lib/db/queries');
          const { saveDatabaseImmediate } = await import('@/app/lib/db');
          recordInviteUsage(generateId(), inviteId, newUser.Id);
          saveDatabaseImmediate();
          console.log('[User Create] Invite usage recorded and saved');
        } else {
          console.log('[User Create] No inviteId provided, skipping usage recording');
        }

        // Send welcome notification if contact info provided
        if (email || discordUsername) {
          const { sendWelcomeNotification } = await import('@/app/lib/notifications');
          await sendWelcomeNotification(newUser.Id, name);
        }
      } catch (dbError) {
        console.error('Failed to store user in database:', dbError);
        // Don't fail the request if DB storage fails
      }
    }

    return NextResponse.json(newUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}