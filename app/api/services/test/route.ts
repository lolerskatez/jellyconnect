import { NextResponse } from 'next/server';
import { emailService } from '../../../lib/email';
import { discordService } from '../../../lib/discord';

export async function GET() {
  const results = {
    email: {
      configured: emailService.isConfigured(),
      testResult: null as boolean | null,
    },
    discord: {
      configured: discordService.isConfigured(),
      testResult: null as boolean | null,
    },
  };

  // Test Email Service
  if (results.email.configured) {
    try {
      results.email.testResult = await emailService.sendEmail(
        'test@example.com',
        'JellyConnect Service Test',
        '<h1>Service Test</h1><p>This is a test email to verify email configuration.</p>',
        'Service Test\n\nThis is a test email to verify email configuration.'
      );
    } catch (error) {
      console.error('Email test failed:', error);
      results.email.testResult = false;
    }
  }

  // Test Discord Service
  if (results.discord.configured) {
    try {
      results.discord.testResult = await discordService.sendDirectMessageByUsername(
        'test-user',
        '**JellyConnect Service Test**\n\nThis is a test message to verify Discord configuration.'
      );
    } catch (error) {
      console.error('Discord test failed:', error);
      results.discord.testResult = false;
    }
  }

  return NextResponse.json(results);
}