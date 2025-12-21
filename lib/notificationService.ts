// Notification service for managing notifications
import { Notification, NotificationType, NotificationChannel, NotificationPreferences } from './notifications';

class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private userPreferences: Map<string, NotificationPreferences> = new Map();

  // Create a new notification
  createNotification(
    type: NotificationType,
    title: string,
    message: string,
    userId?: string,
    channels: NotificationChannel[] = [NotificationChannel.IN_APP],
    metadata?: Record<string, any>,
    expiresAt?: Date
  ): Notification {
    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      userId,
      channels,
      metadata,
      expiresAt,
    };

    this.notifications.set(notification.id, notification);

    // Trigger delivery based on channels and user preferences
    this.deliverNotification(notification);

    return notification;
  }

  // Get notifications for a user (or system-wide if no userId)
  getNotifications(userId?: string): Notification[] {
    const allNotifications = Array.from(this.notifications.values());

    if (!userId) {
      // Return system-wide notifications
      return allNotifications.filter(n => !n.userId);
    }

    // Return user-specific and system-wide notifications
    return allNotifications.filter(n => !n.userId || n.userId === userId);
  }

  // Mark notification as read
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  // Delete notification
  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  // Get user notification preferences
  getUserPreferences(userId: string): NotificationPreferences | undefined {
    return this.userPreferences.get(userId);
  }

  // Update user notification preferences
  updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): void {
    const existing = this.userPreferences.get(userId) || {
      userId,
      ...preferences,
    } as NotificationPreferences;

    this.userPreferences.set(userId, { ...existing, ...preferences });
  }

  // Clean up expired notifications
  cleanupExpiredNotifications(): void {
    const now = new Date();
    for (const [id, notification] of this.notifications) {
      if (notification.expiresAt && notification.expiresAt < now) {
        this.notifications.delete(id);
      }
    }
  }

  // Deliver notification based on channels
  private async deliverNotification(notification: Notification): Promise<void> {
    for (const channel of notification.channels) {
      switch (channel) {
        case NotificationChannel.IN_APP:
          // Handled by React context
          break;
        case NotificationChannel.EMAIL:
        case NotificationChannel.DISCORD:
          // Only deliver external notifications on server-side
          if (typeof window === 'undefined' && notification.userId) {
            try {
              const { sendNotification } = await import('../app/lib/notifications');
              await sendNotification({
                userId: notification.userId,
                subject: notification.title,
                message: notification.message,
                type: 'custom'
              });
            } catch (error) {
              console.error(`Failed to send ${channel} notification:`, error);
            }
          }
          break;
      }
    }
  }

  // Generate unique ID for notifications
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// Helper functions for common notification types
export const createAccountExpiryNotification = (
  userId: string,
  daysUntilExpiry: number,
  expiryDate: Date
): Notification => {
  return notificationService.createNotification(
    NotificationType.ACCOUNT_EXPIRY,
    'Account Expiry Warning',
    `Your account will expire in ${daysUntilExpiry} days on ${expiryDate.toLocaleDateString()}.`,
    userId,
    [NotificationChannel.IN_APP],
    { daysUntilExpiry, expiryDate }
  );
};

export const createLoginAttemptNotification = (
  userId: string,
  success: boolean,
  ipAddress?: string
): Notification => {
  const type = success ? NotificationType.SUCCESS : NotificationType.WARNING;
  const title = success ? 'Successful Login' : 'Failed Login Attempt';
  const message = success
    ? 'A successful login was detected.'
    : `A failed login attempt was detected${ipAddress ? ` from IP ${ipAddress}` : ''}.`;

  return notificationService.createNotification(
    type,
    title,
    message,
    userId,
    [NotificationChannel.IN_APP],
    { success, ipAddress }
  );
};

export const createSystemAlertNotification = (
  title: string,
  message: string,
  userId?: string
): Notification => {
  return notificationService.createNotification(
    NotificationType.SYSTEM_ALERT,
    title,
    message,
    userId,
    [NotificationChannel.IN_APP]
  );
};