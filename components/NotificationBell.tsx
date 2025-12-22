'use client';

import React, { useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useNotifications } from './NotificationProvider';
import { Notification, NotificationType } from '@/lib/notifications-types';

const NotificationIcon: React.FC = () => {
  const { unreadCount } = useNotifications();

  return (
    <div className="relative">
      <Bell className="h-6 w-6 text-slate-300 hover:text-white cursor-pointer transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
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
        return 'border-green-500 bg-green-900/30';
      case NotificationType.EXPIRY_WARNING:
        return 'border-yellow-500 bg-yellow-900/30';
      case NotificationType.ACCOUNT_DISABLED:
        return 'border-red-500 bg-red-900/30';
      case NotificationType.INVITE_USED:
        return 'border-orange-500 bg-orange-900/30';
      case NotificationType.SYSTEM_ALERT:
        return 'border-purple-500 bg-purple-900/30';
      default:
        return 'border-slate-500 bg-slate-700/50';
    }
  };

  return (
    <div className={`p-4 border-l-4 ${getTypeColor(notification.type)} ${!notification.read ? 'bg-slate-700/50' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-white truncate">{notification.title}</h4>
          <p className="text-sm text-slate-300 mt-1 break-words">{notification.message}</p>
          <p className="text-xs text-slate-500 mt-2">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex space-x-2 ml-2 flex-shrink-0">
          {!notification.read && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="text-green-400 hover:text-green-300 transition-colors"
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="text-red-400 hover:text-red-300 transition-colors"
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
    <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-[70vh] sm:max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800 z-10">
        <h3 className="font-semibold text-white">Notifications</h3>
        <div className="flex space-x-2">
          <button
            onClick={clearAllNotifications}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close notifications"
            title="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div>
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
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