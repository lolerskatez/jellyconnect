import { getUserContacts, getNotificationSettings } from './db/queries';
import { emailService } from './email';
import { discordService } from './discord';
import { NotificationType } from '../../lib/notifications-types';
import { notificationLogger } from './logger';

// Notification types
export interface NotificationData {
  userId: string;
  subject: string;
  message: string;
  type: 'welcome' | 'expiry_warning' | 'account_disabled' | 'invite_used' | 'system_alert' | 'custom';
}

// Check if user wants to receive this type of notification
function shouldReceiveNotificationType(settings: any, notificationType: string): boolean {
  if (!settings) return true; // Default to sending if no settings

  switch (notificationType) {
    case 'welcome':
      return settings.welcomeNotifications ?? true;
    case 'expiry_warning':
      return settings.expiryWarnings ?? true;
    case 'account_disabled':
    case 'invite_used':
      return settings.accountAlerts ?? true;
    case 'system_alert':
      return settings.systemAlerts ?? true;
    case 'custom':
    default:
      return true; // Always send custom notifications
  }
}

// Send notification to a user
export async function sendNotification(data: NotificationData): Promise<void> {
  const contacts = getUserContacts(data.userId);
  const settings = getNotificationSettings(data.userId);

  if (!contacts) {
    notificationLogger.warn('No contact information found for user', { userId: data.userId })
    return;
  }

  // Check if user wants to receive this notification type
  if (!shouldReceiveNotificationType(settings, data.type)) {
    notificationLogger.info('User has disabled notifications', { userId: data.userId, type: data.type })
    return;
  }

  const promises: Promise<void>[] = [];

  // Send email if enabled and email exists
  if (settings?.emailEnabled && contacts.email) {
    promises.push(sendEmail(contacts.email, data.subject, data.message));
  }

  // Send Discord DM if enabled and Discord username exists
  if (settings?.discordEnabled && contacts.discordUsername) {
    promises.push(sendDiscordMessage(contacts.discordUsername, data.subject, data.message));
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
      notificationLogger.info('Email service not configured - logging email details', {
        to,
        subject,
        messageLength: message.length
      })
    }
  } catch (error) {
    notificationLogger.error('Failed to send email', { to, error: error instanceof Error ? error.message : 'Unknown error' })
    throw error;
  }
}

// Send Discord notification
async function sendDiscordMessage(discordUsername: string, subject: string, message: string): Promise<void> {
  try {
    // Format message for Discord
    const discordMessage = `**${subject}**\n\n${message}`;

    // Send DM by username
    const success = await discordService.sendDirectMessageByUsername(discordUsername, discordMessage);

    if (!success) {
      notificationLogger.info('Discord service not configured or user not found - logging message details', {
        discordUsername,
        subject,
        messageLength: message.length
      })
    }
  } catch (error) {
    notificationLogger.error('Failed to send Discord message', { discordUsername, error: error instanceof Error ? error.message : 'Unknown error' })
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