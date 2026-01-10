import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '../../../lib/email';
import { discordService } from '../../../lib/discord';
import { servicesLogger } from '@/app/lib/logger';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, config } = body;

    if (service === 'email' && config) {
      // Test email configuration with provided credentials
      try {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: {
            user: config.user,
            pass: config.pass,
          },
        });

        // Verify connection
        await transporter.verify();

        return NextResponse.json({
          success: true,
          message: 'SMTP connection successful',
          service: 'email',
        });
      } catch (error) {
        servicesLogger.error('SMTP test failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
          {
            success: false,
            error: 'SMTP test failed',
            message: error instanceof Error ? error.message : String(error),
            service: 'email',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid service or missing configuration' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Test request failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Reinitialize services to pick up latest config
  emailService.reinitialize();
  discordService.reinitialize();

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
      servicesLogger.error('Email test failed', { error: error instanceof Error ? error.message : String(error) });
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
      servicesLogger.error('Discord test failed', { error: error instanceof Error ? error.message : String(error) });
      results.discord.testResult = false;
    }
  }

  return NextResponse.json(results);
}