import { NextRequest, NextResponse } from 'next/server';
import { getUserContacts } from '@/app/lib/db/queries';
import { emailService } from '@/app/lib/email';
import { discordService } from '@/app/lib/discord';

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
        console.log(`[TEST] Sending email to: ${contacts.email}`);
        const htmlMessage = message.replace(/\n/g, '<br>');
        const success = await emailService.sendEmail(contacts.email, subject, htmlMessage, message);
        results.email = success ? 'sent' : 'not_configured';
        console.log(`[TEST] Email result: ${results.email}`);
      } catch (error) {
        console.error('[TEST] Failed to send test email:', error);
        results.email = 'failed';
      }
    } else {
      results.error = 'User has no email address configured';
    }

    // Send test Discord message if user has Discord username configured
    if (contacts.discordUsername) {
      try {
        console.log(`[TEST] Sending Discord DM to: ${contacts.discordUsername}`);
        const discordMessage = `**${subject}**\n\n${message}`;
        const success = await discordService.sendDirectMessageByUsername(contacts.discordUsername, discordMessage);
        results.discord = success ? 'sent' : 'failed';
        console.log(`[TEST] Discord result: ${results.discord}`);
      } catch (error) {
        console.error('[TEST] Failed to send test Discord message:', error);
        results.discord = 'failed';
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[TEST] Failed to send test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}