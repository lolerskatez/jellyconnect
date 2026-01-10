import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '../../lib/config';
import { updateSettingsSchema } from '@/app/lib/validation';
import { settingsLogger } from '@/app/lib/logger';

export async function GET() {
  try {
    const config = getConfig();

    // Return settings including Jellyfin configuration
    const settings = {
      jellyfinUrl: config.jellyfinUrl || '',
      publishedUrl: config.publishedUrl || '',
      apiKey: config.apiKey || '',
      nextAuthUrl: config.nextAuthUrl || '',
      smtp: config.smtp || {
        host: '',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        from: ''
      },
      discord: config.discord || {
        botToken: ''
      }
    };

    return NextResponse.json(settings);
  } catch (error) {
    settingsLogger.error('Failed to fetch settings', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    settingsLogger.info('Received settings update request', { body });

    // Validate input
    const validationResult = updateSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      settingsLogger.error('Validation failed', { issues: validationResult.error.issues });
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { jellyfinUrl, publishedUrl, apiKey, nextAuthUrl, smtp, discord } = validationResult.data;

    // Get current config and update settings
    const currentConfig = getConfig();
    const updatedConfig = {
      ...currentConfig,
      jellyfinUrl: jellyfinUrl,
      publishedUrl: publishedUrl || currentConfig.publishedUrl,
      apiKey: apiKey || currentConfig.apiKey,
      nextAuthUrl: nextAuthUrl || currentConfig.nextAuthUrl,
      smtp: smtp,
      discord: discord
    };

    // Save the updated config
    saveConfig(updatedConfig);

    // Reinitialize notification services to pick up new config
    const { emailService } = await import('../../lib/email');
    const { discordService } = await import('../../lib/discord');
    emailService.reinitialize();
    discordService.reinitialize();

    return NextResponse.json({ success: true });
  } catch (error) {
    settingsLogger.error('Failed to save settings', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}