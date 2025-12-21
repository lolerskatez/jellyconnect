import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/app/lib/config';
import { JellyfinAuth, buildJellyfinBaseUrl } from '@/app/lib/jellyfin';

export async function GET(request: NextRequest) {
  const baseUrl = request.headers.get('x-jellyfin-url');
  const apiKey = request.headers.get('x-jellyfin-api-key');

  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: 'Missing Jellyfin base URL or API key' },
      { status: 400 }
    );
  }

  // Save to config
  saveConfig({ jellyfinUrl: baseUrl, apiKey });

  const processedBaseUrl = buildJellyfinBaseUrl(baseUrl);
  const jellyfinClient = new JellyfinAuth(processedBaseUrl, apiKey);

  try {
    const isValid = await jellyfinClient.validateApiKey();
    if (isValid) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid Jellyfin API key' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      { error: 'API key validation failed', details: String(error) },
      { status: 400 }
    );
  }
}