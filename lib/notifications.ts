// Notification types and interfaces for JellyConnect
// Re-export from canonical source for backward compatibility
export { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  type Notification as NotificationBase,
  type NotificationPreferences as NotificationPreferencesBase
} from './notifications-types';

// Extended interfaces for server-side use
export interface Notification {
  id: string;
  type: import('./notifications-types').NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
  channels: import('./notifications-types').NotificationChannel[];
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    [key: string]: boolean;
  };
  types: {
    [key: string]: boolean;
  };
  emailAddress?: string;
  discordWebhookUrl?: string;
}

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
  channels: {
    'email': false,
    'discord': false,
    'slack': false,
    'telegram': false,
    'webhook': false,
  },
  types: {
    'account_expiry': true,
    'login_attempt': true,
    'system_alert': true,
  },
};