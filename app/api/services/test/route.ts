import { NextResponse } from 'next/server';
import { emailService } from '../../../lib/email';
import { discordService } from '../../../lib/discord';
import { slackService } from '../../../lib/slack';
import { telegramService } from '../../../lib/telegram';
import { webhookService } from '../../../lib/webhook';

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
    slack: {
      configured: slackService.isConfigured(),
      testResult: null as boolean | null,
    },
    telegram: {
      configured: telegramService.isConfigured(),
      testResult: null as boolean | null,
    },
    webhook: {
      configured: webhookService.isConfigured(),
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
      results.discord.testResult = await discordService.sendMessage(
        '**JellyConnect Service Test**\n\nThis is a test message to verify Discord configuration.'
      );
    } catch (error) {
      console.error('Discord test failed:', error);
      results.discord.testResult = false;
    }
  }

  // Test Slack Service
  if (results.slack.configured) {
    try {
      results.slack.testResult = await slackService.sendMessage(
        '*JellyConnect Service Test*\n\nThis is a test message to verify Slack configuration.'
      );
    } catch (error) {
      console.error('Slack test failed:', error);
      results.slack.testResult = false;
    }
  }

  // Test Telegram Service
  if (results.telegram.configured) {
    try {
      results.telegram.testResult = await telegramService.sendMessage(
        '*JellyConnect Service Test*\n\nThis is a test message to verify Telegram configuration.'
      );
    } catch (error) {
      console.error('Telegram test failed:', error);
      results.telegram.testResult = false;
    }
  }

  // Test Webhook Service
  if (results.webhook.configured) {
    try {
      results.webhook.testResult = await webhookService.sendNotification({
        userId: 'test-user',
        subject: 'Service Test',
        message: 'This is a test webhook to verify webhook configuration.',
        type: 'custom',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Webhook test failed:', error);
      results.webhook.testResult = false;
    }
  }

  return NextResponse.json(results);
}