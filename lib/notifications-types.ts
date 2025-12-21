// Shared notification types safe for both client and server

export enum NotificationType {
  WELCOME = 'welcome',
  EXPIRY_WARNING = 'expiry_warning',
  ACCOUNT_DISABLED = 'account_disabled',
  INVITE_USED = 'invite_used',
  SYSTEM_ALERT = 'system_alert',
  CUSTOM = 'custom'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  DISCORD = 'discord',
  SLACK = 'slack',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  discordEnabled: boolean;
  slackEnabled: boolean;
  telegramEnabled: boolean;
  webhookEnabled: boolean;
  expiryWarnings: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}
