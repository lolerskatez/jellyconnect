'use client';

import React, { useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useNotifications } from './NotificationProvider';
import { Notification, NotificationType } from '@/lib/notifications-types';

const NotificationIcon: React.FC = () => {
  const { unreadCount } = useNotifications();

  return (
    <div className="relative">
      <Bell className="h-6 w-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
};

const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ notification, onMarkAsRead, onDelete }) => {
  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.WELCOME:
        return 'border-green-500 bg-green-50';
      case NotificationType.EXPIRY_WARNING:
        return 'border-yellow-500 bg-yellow-50';
      case NotificationType.ACCOUNT_DISABLED:
        return 'border-red-500 bg-red-50';
      case NotificationType.INVITE_USED:
        return 'border-orange-500 bg-orange-50';
      case NotificationType.SYSTEM_ALERT:
        return 'border-purple-500 bg-purple-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className={`p-4 border-l-4 ${getTypeColor(notification.type)} ${!notification.read ? 'bg-blue-50' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{notification.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-2">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex space-x-2 ml-4">
          {!notification.read && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="text-blue-500 hover:text-blue-700"
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="text-red-500 hover:text-red-700"
            title="Delete notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { notifications, markAsRead, deleteNotification, clearAllNotifications } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold">Notifications</h3>
        <div className="flex space-x-2">
          <button
            onClick={clearAllNotifications}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close notifications"
            title="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div>
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle notifications"
        title="Show notifications"
      >
        <NotificationIcon />
      </button>
      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};