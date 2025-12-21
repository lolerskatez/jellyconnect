import { getUserContacts, getNotificationSettings } from './db/queries';
import { emailService } from './email';
import { discordService } from './discord';
import { slackService } from './slack';
import { telegramService } from './telegram';
import { webhookService } from './webhook';

// Notification types
export interface NotificationData {
  userId: string;
  subject: string;
  message: string;
  type: 'welcome' | 'expiry_warning' | 'account_disabled' | 'invite_used' | 'custom';
}

// Send notification to a user
export async function sendNotification(data: NotificationData): Promise<void> {
  const contacts = getUserContacts(data.userId);
  const settings = getNotificationSettings(data.userId);

  if (!contacts) {
    console.warn(`No contact information found for user ${data.userId}`);
    return;
  }

  const promises: Promise<void>[] = [];

  // Send email if enabled and email exists
  if (settings?.emailEnabled && contacts.email) {
    promises.push(sendEmail(contacts.email, data.subject, data.message));
  }

  // Send Discord message if enabled and Discord ID exists
  if (settings?.discordEnabled && contacts.discordId) {
    promises.push(sendDiscordMessage(contacts.discordId, data.subject, data.message));
  }

  // Send Slack message if enabled and Slack ID exists
  if (settings?.slackEnabled && contacts.slackId) {
    promises.push(sendSlackMessage(contacts.slackId, data.subject, data.message));
  }

  // Send Telegram message if enabled and Telegram ID exists
  if (settings?.telegramEnabled && contacts.telegramId) {
    promises.push(sendTelegramMessage(contacts.telegramId, data.subject, data.message));
  }

  // Send webhook notification if enabled and webhook URL exists
  if (settings?.webhookEnabled && contacts.webhookUrl) {
    promises.push(sendWebhookNotification({
      userId: data.userId,
      subject: data.subject,
      message: data.message,
      type: data.type,
      timestamp: new Date().toISOString()
    }));
  }

  // Wait for all notifications to complete
  await Promise.allSettled(promises);
}

// Send email notification
async function sendEmail(to: string, subject: string, message: string): Promise<void> {
  try {
    // Convert plain text message to HTML
    const htmlMessage = message.replace(/\n/g, '<br>');

    const success = await emailService.sendEmail(to, subject, htmlMessage, message);

    if (!success) {
      console.log(`📧 EMAIL TO: ${to}`);
      console.log(`📧 SUBJECT: ${subject}`);
      console.log(`📧 MESSAGE: ${message}`);
      console.log('--- (Email service not configured)');
    }
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}

// Send Discord notification
async function sendDiscordMessage(discordId: string, subject: string, message: string): Promise<void> {
  try {
    // Format message for Discord
    const discordMessage = `**${subject}**\n\n${message}`;

    // Try to send as DM first, fallback to webhook/channel
    let success = await discordService.sendDirectMessage(discordId, discordMessage);

    if (!success) {
      // If DM fails, try webhook (this would send to a channel)
      success = await discordService.sendMessage(`<@${discordId}>\n${discordMessage}`);
    }

    if (!success) {
      console.log(`💬 DISCORD TO: ${discordId}`);
      console.log(`💬 SUBJECT: ${subject}`);
      console.log(`💬 MESSAGE: ${message}`);
      console.log('--- (Discord service not configured)');
    }
  } catch (error) {
    console.error(`Failed to send Discord message to ${discordId}:`, error);
    throw error;
  }
}

// Send Slack notification
async function sendSlackMessage(slackId: string, subject: string, message: string): Promise<void> {
  try {
    // Format message for Slack
    const slackMessage = `*${subject}*\n\n${message}`;

    const success = await slackService.sendMessage(slackMessage);

    if (!success) {
      console.log(`📱 SLACK TO: ${slackId}`);
      console.log(`📱 SUBJECT: ${subject}`);
      console.log(`📱 MESSAGE: ${message}`);
      console.log('--- (Slack service not configured)');
    }
  } catch (error) {
    console.error(`Failed to send Slack message to ${slackId}:`, error);
    throw error;
  }
}

// Send Telegram notification
async function sendTelegramMessage(telegramId: string, subject: string, message: string): Promise<void> {
  try {
    // Format message for Telegram
    const telegramMessage = `*${subject}*\n\n${message}`;

    const success = await telegramService.sendMessage(telegramMessage, telegramId);

    if (!success) {
      console.log(`✈️ TELEGRAM TO: ${telegramId}`);
      console.log(`✈️ SUBJECT: ${subject}`);
      console.log(`✈️ MESSAGE: ${message}`);
      console.log('--- (Telegram service not configured)');
    }
  } catch (error) {
    console.error(`Failed to send Telegram message to ${telegramId}:`, error);
    throw error;
  }
}

// Send webhook notification
async function sendWebhookNotification(payload: any): Promise<void> {
  try {
    const success = await webhookService.sendNotification(payload);

    if (!success) {
      console.log(`🔗 WEBHOOK PAYLOAD:`, payload);
      console.log('--- (Webhook service not configured)');
    }
  } catch (error) {
    console.error('Failed to send webhook notification:', error);
    throw error;
  }
}

// Send welcome notification to new user
export async function sendWelcomeNotification(userId: string, username: string): Promise<void> {
  await sendNotification({
    userId,
    subject: 'Welcome to JellyConnect!',
    message: `Hello ${username}!\n\nWelcome to JellyConnect! Your account has been successfully created.\n\nYou can now access Jellyfin using your credentials.\n\nBest regards,\nJellyConnect Team`,
    type: 'welcome'
  });
}

// Send expiry warning notification
export async function sendExpiryWarningNotification(userId: string, username: string, daysUntilExpiry: number): Promise<void> {
  await sendNotification({
    userId,
    subject: 'Account Expiry Warning',
    message: `Hello ${username},\n\nYour JellyConnect account will expire in ${daysUntilExpiry} days.\n\nPlease contact an administrator to extend your account if needed.\n\nBest regards,\nJellyConnect Team`,
    type: 'expiry_warning'
  });
}

// Send account disabled notification
export async function sendAccountDisabledNotification(userId: string, username: string): Promise<void> {
  await sendNotification({
    userId,
    subject: 'Account Disabled',
    message: `Hello ${username},\n\nYour JellyConnect account has been disabled.\n\nPlease contact an administrator for assistance.\n\nBest regards,\nJellyConnect Team`,
    type: 'account_disabled'
  });
}

// Send invite used notification (to admin)
export async function sendInviteUsedNotification(adminUserId: string, inviteCode: string, newUsername: string): Promise<void> {
  await sendNotification({
    userId: adminUserId,
    subject: 'Invite Code Used',
    message: `An invite code has been used:\n\nCode: ${inviteCode}\nNew User: ${newUsername}\n\nThe user has successfully registered.`,
    type: 'invite_used'
  });
}