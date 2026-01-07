import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '../../lib/config';
import { updateSettingsSchema } from '@/app/lib/validation';

export async function GET() {
  try {
    const config = getConfig();

    // Return only the notification-related settings
    const settings = {
      jellyfinUrl: config.jellyfinUrl || '',
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
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = updateSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { jellyfinUrl, smtp, discord } = validationResult.data;

    // Get current config and update only the notification settings
    const currentConfig = getConfig();
    const updatedConfig = {
      ...currentConfig,
      jellyfinUrl: jellyfinUrl,
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
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}