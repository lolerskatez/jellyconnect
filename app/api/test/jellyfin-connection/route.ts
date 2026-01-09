import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';
import { JellyfinAuth, buildJellyfinBaseUrl } from '@/app/lib/jellyfin';
import { jellyfinLogger } from '@/app/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const config = getConfig();
    
    const testResult: any = {
      configLoaded: !!config,
      jellyfinUrl: config.jellyfinUrl || 'NOT SET',
      apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'NOT SET',
      processedUrl: buildJellyfinBaseUrl(config.jellyfinUrl),
    };

    if (!config.jellyfinUrl || !config.apiKey) {
      return NextResponse.json({
        ...testResult,
        status: 'FAILED',
        error: 'Jellyfin URL or API key not configured'
      });
    }

    // Try to validate the API key
    const baseUrl = buildJellyfinBaseUrl(config.jellyfinUrl);
    const jellyfinAuth = new JellyfinAuth(baseUrl, config.apiKey);
    
    const isValid = await jellyfinAuth.validateApiKey();
    
    return NextResponse.json({
      ...testResult,
      status: isValid ? 'SUCCESS' : 'FAILED',
      apiKeyValid: isValid,
      message: isValid ? 'Jellyfin connection successful' : 'Jellyfin API key validation failed'
    });
  } catch (error) {
    jellyfinLogger.error('Jellyfin connection test failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
