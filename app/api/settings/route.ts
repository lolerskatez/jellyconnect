import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '../../lib/config';

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
        webhookUrl: '',
        botToken: '',
        channelId: ''
      },
      slack: config.slack || {
        webhookUrl: '',
        botToken: '',
        channelId: ''
      },
      telegram: config.telegram || {
        botToken: '',
        chatId: ''
      },
      webhook: config.webhook || {
        url: '',
        secret: '',
        headers: {}
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

    // Validate the input
    if (!body.jellyfinUrl || !body.smtp || !body.discord || !body.slack || !body.telegram || !body.webhook) {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // Get current config and update only the notification settings
    const currentConfig = getConfig();
    const updatedConfig = {
      ...currentConfig,
      jellyfinUrl: body.jellyfinUrl || '',
      smtp: {
        host: body.smtp.host || '',
        port: body.smtp.port || 587,
        secure: body.smtp.secure || false,
        user: body.smtp.user || '',
        pass: body.smtp.pass || '',
        from: body.smtp.from || body.smtp.user || '',
      },
      discord: {
        webhookUrl: body.discord.webhookUrl || '',
        botToken: body.discord.botToken || '',
        channelId: body.discord.channelId || '',
      },
      slack: {
        webhookUrl: body.slack.webhookUrl || '',
        botToken: body.slack.botToken || '',
        channelId: body.slack.channelId || '',
      },
      telegram: {
        botToken: body.telegram.botToken || '',
        chatId: body.telegram.chatId || '',
      },
      webhook: {
        url: body.webhook.url || '',
        secret: body.webhook.secret || '',
        headers: body.webhook.headers || {},
      }
    };

    // Save the updated config
    saveConfig(updatedConfig);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}