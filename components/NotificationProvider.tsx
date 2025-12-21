'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Notification, NotificationChannel } from '@/lib/notifications-types';
import { notificationService } from '@/lib/notificationService-client';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  userId,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications on mount and when userId changes
  useEffect(() => {
    const loadNotifications = () => {
      const userNotifications = notificationService.getNotifications(userId);
      setNotifications(userNotifications);
    };

    loadNotifications();

    // Set up periodic cleanup of expired notifications
    const cleanupInterval = setInterval(() => {
      notificationService.cleanupExpiredNotifications();
      loadNotifications();
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanupInterval);
  }, [userId]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const deleteNotification = (notificationId: string) => {
    notificationService.deleteNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    notifications.forEach(n => notificationService.deleteNotification(n.id));
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    deleteNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};