import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';
import { createUser, generateId } from '@/app/lib/db/queries';
import { createUserSchema } from '@/app/lib/validation';
import { usersLogger } from '@/app/lib/logger';
import { successResponse, errorResponse, validationErrorResponse } from '@/app/lib/api-response';

export async function GET() {
  try {
    const config = getConfig();

    if (!config.jellyfinUrl) {
      usersLogger.error('Jellyfin URL not configured');
      return NextResponse.json(
        errorResponse('Jellyfin server URL not configured. Please configure it in settings.', 'JELLYFIN_CONFIG_ERROR', 500),
        { status: 500 }
      );
    }

    if (!config.apiKey) {
      usersLogger.error('Jellyfin API key not configured');
      return NextResponse.json(
        errorResponse('Jellyfin API key not configured. Please generate an API key in Jellyfin admin panel and configure it in settings.', 'JELLYFIN_CONFIG_ERROR', 500),
        { status: 500 }
      );
    }

    usersLogger.debug('Fetching users from Jellyfin', { 
      url: config.jellyfinUrl,
      apiKeyPrefix: config.apiKey.substring(0, 8) + '...'
    });

    let usersRes: Response;
    try {
      usersRes = await fetch(`${config.jellyfinUrl}/Users`, {
        headers: { 'X-Emby-Token': config.apiKey },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      usersLogger.error('Failed to connect to Jellyfin server', { 
        error: errorMsg,
        url: config.jellyfinUrl,
        errorType: fetchError instanceof Error ? fetchError.name : 'Unknown'
      });

      let hint = '';
      if (errorMsg.includes('ECONNREFUSED')) {
        hint = 'Jellyfin server is not responding. Verify it is running and the URL is correct.';
      } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
        hint = 'Cannot resolve Jellyfin hostname. Verify the URL is correct and the server is accessible.';
      } else if (errorMsg.includes('timeout')) {
        hint = 'Connection timeout. Jellyfin server may be slow or unreachable.';
      }

      return NextResponse.json(
        errorResponse(
          `Failed to connect to Jellyfin server: ${errorMsg}${hint ? ' - ' + hint : ''}`,
          'JELLYFIN_CONNECTION_ERROR',
          500
        ),
        { status: 500 }
      );
    }

    if (!usersRes.ok) {
      const responseText = await usersRes.text();
      usersLogger.error('Jellyfin API error fetching users', { 
        status: usersRes.status, 
        statusText: usersRes.statusText,
        response: responseText.substring(0, 200), // Log first 200 chars
        apiKeyPrefix: config.apiKey.substring(0, 8) + '...'
      });

      let hint = '';
      if (usersRes.status === 401 || usersRes.status === 403) {
        hint = 'API key is invalid or has been revoked. Generate a new API key in Jellyfin admin panel.';
      } else if (usersRes.status === 404) {
        hint = 'Jellyfin API endpoint not found. Verify the server URL is correct.';
      }

      return NextResponse.json(
        errorResponse(
          `Failed to fetch users from Jellyfin: ${usersRes.status} ${usersRes.statusText}${hint ? ' - ' + hint : ''}`,
          'JELLYFIN_API_ERROR',
          usersRes.status === 401 ? 401 : 500
        ),
        { status: usersRes.status === 401 ? 401 : 500 }
      );
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
      return NextResponse.json(
        successResponse(usersWithOidc, 'Users retrieved successfully'),
        { status: 200 }
      );
    } catch (error) {
      usersLogger.warn('Could not fetch oidcProvider from database', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        successResponse(users, 'Users retrieved successfully'),
        { status: 200 }
      );
    }
  } catch (error) {
    usersLogger.error('Error fetching users', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Unknown error', 'USERS_FETCH_ERROR', 500),
      { status: 500 }
    );
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
        validationErrorResponse(validationResult.error.issues),
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

    return NextResponse.json(
      successResponse(newUser, 'User created successfully'),
      { status: 201 }
    );
  } catch (error) {
    usersLogger.error('Failed to create user', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Failed to create user', 'USER_CREATE_ERROR', 500),
      { status: 500 }
    );
  }
}