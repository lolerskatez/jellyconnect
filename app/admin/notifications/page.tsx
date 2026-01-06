"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"

interface Notification {
  id: string
  userId: string
  type: 'expiry' | 'invite' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: string
  userName?: string
}

export default function NotificationsPage() {
  const { admin } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'expiry' | 'invite' | 'system'>('all')

  useEffect(() => {
    if (admin) {
      fetchNotifications()
    }
  }, [admin])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      } else {
        setError('Failed to fetch notifications')
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setError('Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT'
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
          )
        )
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT'
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, read: true }))
        )
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setNotifications(prev => prev.filter(notification => notification.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const clearAllNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/clear-all', {
        method: 'DELETE'
      })
      if (response.ok) {
        setNotifications([])
      }
    } catch (err) {
      console.error('Failed to clear all notifications:', err)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const readFilter = filter === 'all' || (filter === 'read' && notification.read) || (filter === 'unread' && !notification.read)
    const typeFilterMatch = typeFilter === 'all' || notification.type === typeFilter
    return readFilter && typeFilterMatch
  })

  const unreadCount = notifications.filter(n => !n.read).length

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="p-4 max-w-4xl mx-auto">
          <div className="bg-red-900 text-red-200 p-4 rounded-lg border border-red-700">
            Access denied. Administrator privileges required.
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="p-4 max-w-4xl mx-auto">
          <div className="text-center text-white">Loading notifications...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="p-4 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent mb-2">System Notifications</h1>
          <p className="text-slate-400">Manage and monitor all system notifications</p>
        </div>

        {error && (
          <div className="bg-red-900 text-red-200 p-4 rounded-lg border border-red-700 mb-6">{error}</div>
        )}

        {/* Stats and Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-400">{notifications.length}</div>
            <div className="text-slate-400">Total Notifications</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-400">{unreadCount}</div>
            <div className="text-slate-400">Unread</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{notifications.filter(n => n.read).length}</div>
            <div className="text-slate-400">Read</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Status</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Types</option>
                  <option value="expiry">Expiry</option>
                  <option value="invite">Invite</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
              >
                Mark All Read
              </button>
              <button
                onClick={clearAllNotifications}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 p-8 rounded-lg text-center">
              <div className="text-slate-400 text-lg mb-2">No notifications found</div>
              <div className="text-slate-500">Notifications will appear here when users receive expiry warnings, invites are used, or system events occur.</div>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-slate-800 border rounded-lg p-4 transition-all duration-200 ${
                  notification.read
                    ? 'border-slate-700 opacity-75'
                    : 'border-orange-500/50 shadow-lg shadow-orange-500/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">{notification.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        notification.type === 'expiry' ? 'bg-red-900 text-red-200' :
                        notification.type === 'invite' ? 'bg-blue-900 text-blue-200' :
                        'bg-purple-900 text-purple-200'
                      }`}>
                        {notification.type}
                      </span>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      )}
                    </div>

                    <p className="text-slate-300 mb-2">{notification.message}</p>

                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>User: {notification.userName || notification.userId}</span>
                      <span>{new Date(notification.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-1 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}