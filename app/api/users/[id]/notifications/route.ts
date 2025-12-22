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
        welcomeNotifications: true,
        expiryWarnings: true,
        accountAlerts: true,
        systemAlerts: false
      });
    }

    return NextResponse.json({
      emailEnabled: settings.emailEnabled,
      discordEnabled: settings.discordEnabled,
      welcomeNotifications: settings.welcomeNotifications,
      expiryWarnings: settings.expiryWarnings,
      accountAlerts: settings.accountAlerts,
      systemAlerts: settings.systemAlerts
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
    const { 
      emailEnabled, 
      discordEnabled, 
      welcomeNotifications, 
      expiryWarnings, 
      accountAlerts, 
      systemAlerts 
    } = await request.json();

    // Validate input
    if (typeof emailEnabled !== 'boolean' ||
        typeof discordEnabled !== 'boolean' ||
        typeof welcomeNotifications !== 'boolean' ||
        typeof expiryWarnings !== 'boolean' ||
        typeof accountAlerts !== 'boolean' ||
        typeof systemAlerts !== 'boolean') {
      return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 });
    }

    const settingsId = generateId();
    const settings = upsertNotificationSettings(settingsId, id, {
      emailEnabled,
      discordEnabled,
      welcomeNotifications,
      expiryWarnings,
      accountAlerts,
      systemAlerts
    });

    return NextResponse.json({
      success: true,
      settings: {
        emailEnabled: settings.emailEnabled,
        discordEnabled: settings.discordEnabled,
        welcomeNotifications: settings.welcomeNotifications,
        expiryWarnings: settings.expiryWarnings,
        accountAlerts: settings.accountAlerts,
        systemAlerts: settings.systemAlerts
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update notification settings' }, { status: 500 });
  }
}