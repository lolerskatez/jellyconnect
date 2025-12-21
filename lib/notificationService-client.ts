// Client-side notification service (browser-safe)
// This uses localStorage and does NOT import any server modules

import { Notification, NotificationType, NotificationChannel, NotificationPriority } from './notifications-types';

class ClientNotificationService {
  private storageKey = 'jellyconnect_notifications';

  getNotifications(userId?: string): Notification[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];

      const notifications: Notification[] = JSON.parse(stored);
      const userNotifications = userId
        ? notifications.filter(n => n.userId === userId)
        : notifications;

      const now = new Date();
      const validNotifications = userNotifications.filter(n =>
        !n.expiresAt || new Date(n.expiresAt) > now
      );

      if (validNotifications.length !== userNotifications.length) {
        this.saveNotifications(validNotifications);
      }

      return validNotifications;
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }

  private saveNotifications(notifications: Notification[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

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
      userId,
      channels,
      priority: NotificationPriority.MEDIUM,
      read: false,
      createdAt: new Date(),
      expiresAt,
      metadata
    };

    const notifications = this.getNotifications();
    notifications.unshift(notification);
    this.saveNotifications(notifications);

    return notification;
  }

  markAsRead(notificationId: string): void {
    const notifications = this.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications(notifications);
    }
  }

  deleteNotification(notificationId: string): void {
    const notifications = this.getNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    this.saveNotifications(filtered);
  }

  clearAllNotifications(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  cleanupExpiredNotifications(): void {
    const notifications = this.getNotifications();
    const now = new Date();
    const validNotifications = notifications.filter(n =>
      !n.expiresAt || new Date(n.expiresAt) > now
    );
    this.saveNotifications(validNotifications);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const notificationService = new ClientNotificationService();
