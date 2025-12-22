// Shared notification types safe for both client and server
// This is the canonical source for all notification types

export enum NotificationType {
  // Modern types
  WELCOME = 'welcome',
  EXPIRY_WARNING = 'expiry_warning',
  ACCOUNT_DISABLED = 'account_disabled',
  INVITE_USED = 'invite_used',
  SYSTEM_ALERT = 'system_alert',
  CUSTOM = 'custom',
  // Legacy types (for backward compatibility)
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  ACCOUNT_EXPIRY = 'account_expiry',
  LOGIN_ATTEMPT = 'login_attempt'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  DISCORD = 'discord'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationPreferences {
  // Channel toggles
  emailEnabled: boolean;
  discordEnabled: boolean;
  
  // Notification type preferences
  welcomeNotifications: boolean;
  expiryWarnings: boolean;
  accountAlerts: boolean;
  systemAlerts: boolean;
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
