import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';
import { JellyfinAuth, buildJellyfinBaseUrl } from '@/app/lib/jellyfin';

export const dynamic = 'force-dynamic';

function getJellyfinClient(request: NextRequest): JellyfinAuth | null {
  const hostFromHeader = request.headers.get('x-jellyfin-url');
  const keyFromHeader = request.headers.get('x-jellyfin-api-key');

  const appConfig = getConfig();
  const finalHost = hostFromHeader || appConfig.jellyfinUrl;
  const finalKey = keyFromHeader || appConfig.apiKey;

  if (!finalHost || !finalKey) {
    return null;
  }

  const processedBaseUrl = buildJellyfinBaseUrl(finalHost);
  return new JellyfinAuth(processedBaseUrl, finalKey);
}

export async function GET(request: NextRequest) {
  const jellyfin = getJellyfinClient(request);
  if (!jellyfin) {
    return NextResponse.json(
      { error: 'Jellyfin URL or API key not configured' },
      { status: 400 }
    );
  }

  try {
    const users = await jellyfin.getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: String(error) },
      { status: 500 }
    );
  }
}