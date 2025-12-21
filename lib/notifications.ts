// Notification types and interfaces for JellyConnect

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  ACCOUNT_EXPIRY = 'account_expiry',
  LOGIN_ATTEMPT = 'login_attempt',
  SYSTEM_ALERT = 'system_alert'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  DISCORD = 'discord',
  SLACK = 'slack',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string; // null for system-wide notifications
  channels: NotificationChannel[];
  metadata?: Record<string, any>; // Additional data like expiry dates, user info, etc.
  expiresAt?: Date; // Optional expiration for temporary notifications
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    [NotificationChannel.EMAIL]: boolean;
    [NotificationChannel.DISCORD]: boolean;
    [NotificationChannel.SLACK]: boolean;
    [NotificationChannel.TELEGRAM]: boolean;
    [NotificationChannel.WEBHOOK]: boolean;
  };
  types: {
    [NotificationType.ACCOUNT_EXPIRY]: boolean;
    [NotificationType.LOGIN_ATTEMPT]: boolean;
    [NotificationType.SYSTEM_ALERT]: boolean;
  };
  emailAddress?: string;
  discordWebhookUrl?: string;
}

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
  channels: {
    [NotificationChannel.EMAIL]: false,
    [NotificationChannel.DISCORD]: false,
    [NotificationChannel.SLACK]: false,
    [NotificationChannel.TELEGRAM]: false,
    [NotificationChannel.WEBHOOK]: false,
  },
  types: {
    [NotificationType.ACCOUNT_EXPIRY]: true,
    [NotificationType.LOGIN_ATTEMPT]: true,
    [NotificationType.SYSTEM_ALERT]: true,
  },
};