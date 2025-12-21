import { NextRequest, NextResponse } from 'next/server';
import { getNotificationSettings, upsertNotificationSettings, generateId } from '@/app/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const settings = getNotificationSettings(id);

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        emailEnabled: false,
        discordEnabled: false,
        slackEnabled: false,
        telegramEnabled: false,
        webhookEnabled: false,
        expiryWarnings: true
      });
    }

    return NextResponse.json({
      emailEnabled: settings.emailEnabled,
      discordEnabled: settings.discordEnabled,
      slackEnabled: settings.slackEnabled,
      telegramEnabled: settings.telegramEnabled,
      webhookEnabled: settings.webhookEnabled,
      expiryWarnings: settings.expiryWarnings
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch notification settings' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { emailEnabled, discordEnabled, slackEnabled, telegramEnabled, webhookEnabled, expiryWarnings } = await request.json();

    // Validate input
    if (typeof emailEnabled !== 'boolean' ||
        typeof discordEnabled !== 'boolean' ||
        typeof slackEnabled !== 'boolean' ||
        typeof telegramEnabled !== 'boolean' ||
        typeof webhookEnabled !== 'boolean' ||
        typeof expiryWarnings !== 'boolean') {
      return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 });
    }

    const settingsId = generateId();
    const settings = upsertNotificationSettings(settingsId, id, {
      emailEnabled,
      discordEnabled,
      slackEnabled,
      telegramEnabled,
      webhookEnabled,
      expiryWarnings
    });

    return NextResponse.json({
      success: true,
      settings: {
        emailEnabled: settings.emailEnabled,
        discordEnabled: settings.discordEnabled,
        slackEnabled: settings.slackEnabled,
        telegramEnabled: settings.telegramEnabled,
        webhookEnabled: settings.webhookEnabled,
        expiryWarnings: settings.expiryWarnings
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update notification settings' }, { status: 500 });
  }
}