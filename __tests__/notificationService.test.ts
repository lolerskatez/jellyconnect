import { notificationService } from '../lib/notificationService';
import { NotificationType, NotificationChannel } from '../lib/notifications';

describe('NotificationService', () => {
  test('should create a notification', () => {
    const notification = notificationService.createNotification(
      NotificationType.SUCCESS,
      'Test Title',
      'Test Message',
      'user123',
      [NotificationChannel.IN_APP]
    );

    expect(notification).toBeDefined();
    expect(notification.type).toBe(NotificationType.SUCCESS);
    expect(notification.title).toBe('Test Title');
    expect(notification.message).toBe('Test Message');
    expect(notification.userId).toBe('user123');
    expect(notification.channels).toContain(NotificationChannel.IN_APP);
    expect(notification.read).toBe(false);
  });

  test('should get notifications for a user', () => {
    // Create fresh notifications for this test
    const notification1 = notificationService.createNotification(
      NotificationType.INFO,
      'User Notification',
      'Message for user',
      'user123'
    );

    const notification2 = notificationService.createNotification(
      NotificationType.WARNING,
      'System Notification',
      'Message for all',
      undefined // system notification
    );

    const userNotifications = notificationService.getNotifications('user123');

    // Should include both user-specific and system notifications
    expect(userNotifications.length).toBeGreaterThanOrEqual(2);
    expect(userNotifications.some(n => n.title === 'User Notification')).toBe(true);
    expect(userNotifications.some(n => n.title === 'System Notification')).toBe(true);
  });

  test('should mark notification as read', () => {
    const notification = notificationService.createNotification(
      NotificationType.INFO,
      'Test',
      'Message',
      'user123'
    );

    const result = notificationService.markAsRead(notification.id);
    expect(result).toBe(true);

    const notifications = notificationService.getNotifications('user123');
    const updatedNotification = notifications.find(n => n.id === notification.id);
    expect(updatedNotification?.read).toBe(true);
  });

  test('should delete notification', () => {
    const notification = notificationService.createNotification(
      NotificationType.INFO,
      'Test',
      'Message',
      'user123'
    );

    const result = notificationService.deleteNotification(notification.id);
    expect(result).toBe(true);

    const notifications = notificationService.getNotifications('user123');
    expect(notifications.find(n => n.id === notification.id)).toBeUndefined();
  });

  test('should cleanup expired notifications', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);

    const expiredNotification = notificationService.createNotification(
      NotificationType.INFO,
      'Expired',
      'Message',
      'user123',
      [NotificationChannel.IN_APP],
      undefined,
      pastDate
    );

    notificationService.cleanupExpiredNotifications();

    const notifications = notificationService.getNotifications('user123');
    expect(notifications.find(n => n.id === expiredNotification.id)).toBeUndefined();
  });
});