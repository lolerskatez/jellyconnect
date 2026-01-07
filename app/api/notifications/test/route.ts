import { NextRequest, NextResponse } from 'next/server';
import { getUserContacts } from '@/app/lib/db/queries';
import { emailService } from '@/app/lib/email';
import { discordService } from '@/app/lib/discord';
import { notificationLogger } from '@/app/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { userId, subject, message } = await request.json();

    if (!userId || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, subject, message' },
        { status: 400 }
      );
    }

    // Get user contacts
    const contacts = getUserContacts(userId);
    if (!contacts) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const results: { email?: string; discord?: string; error?: string } = {};

    // Send test email if user has email configured
    if (contacts.email) {
      try {
        notificationsLogger.info('Sending test email', { userId, email: contacts.email });
        const htmlMessage = message.replace(/\n/g, '<br>');
        const success = await emailService.sendEmail(contacts.email, subject, htmlMessage, message);
        results.email = success ? 'sent' : 'not_configured';
        notificationsLogger.info('Test email result', { userId, result: results.email });
      } catch (error) {
        notificationsLogger.error('Failed to send test email', { userId, error: error instanceof Error ? error.message : String(error) });
        results.email = 'failed';
      }
    } else {
      results.error = 'User has no email address configured';
    }

    // Send test Discord message if user has Discord username configured
    if (contacts.discordUsername) {
      try {
        notificationsLogger.info('Sending test Discord DM', { userId, discordUsername: contacts.discordUsername });
        const discordMessage = `**${subject}**\n\n${message}`;
        const success = await discordService.sendDirectMessageByUsername(contacts.discordUsername, discordMessage);
        results.discord = success ? 'sent' : 'failed';
        notificationsLogger.info('Test Discord result', { userId, result: results.discord });
      } catch (error) {
        notificationsLogger.error('Failed to send test Discord message', { userId, error: error instanceof Error ? error.message : String(error) });
        results.discord = 'failed';
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    notificationLogger.error('Failed to send test notification', { userId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}