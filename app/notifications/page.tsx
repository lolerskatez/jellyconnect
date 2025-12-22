"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"

interface User {
  Id: string
  Name: string
  Policy: {
    IsAdministrator: boolean
    IsDisabled: boolean
  }
}

interface NotificationSettings {
  emailEnabled: boolean
  discordEnabled: boolean
  welcomeNotifications: boolean
  expiryWarnings: boolean
  accountAlerts: boolean
  systemAlerts: boolean
}

interface UserWithNotifications extends User {
  contacts: {
    email?: string
    discordUsername?: string
  }
  notificationSettings: NotificationSettings
}

export default function NotificationsPage() {
  const { admin } = useAuth()
  const [users, setUsers] = useState<UserWithNotifications[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Bulk notification form
  const [bulkNotification, setBulkNotification] = useState({
    subject: '',
    message: '',
    sendToAll: false,
    selectedUsers: [] as string[],
    notificationType: 'custom' as 'welcome' | 'expiry_warning' | 'account_disabled' | 'invite_used' | 'custom'
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Notification templates
  const getNotificationTemplate = (type: string) => {
    switch (type) {
      case 'welcome':
        return {
          subject: 'Welcome to JellyConnect!',
          message: 'Welcome to JellyConnect! Your account has been created and you now have access to our media server.\n\nYou can access the server at: [SERVER_URL]\n\nIf you have any questions, please contact an administrator.'
        }
      case 'expiry_warning':
        return {
          subject: 'Account Expiry Warning',
          message: 'Your JellyConnect account is expiring soon. Please contact an administrator to extend your access.\n\nExpiry Date: [EXPIRY_DATE]\n\nIf your account expires, you will lose access to the media server.'
        }
      case 'account_disabled':
        return {
          subject: 'Account Disabled',
          message: 'Your JellyConnect account has been disabled. If you believe this is an error, please contact an administrator.\n\nReason: [DISABLE_REASON]'
        }
      case 'invite_used':
        return {
          subject: 'Invite Code Used',
          message: 'Your invite code has been successfully used to create a new account.\n\nInvite Code: [INVITE_CODE]\nNew User: [NEW_USER_NAME]'
        }
      default:
        return {
          subject: '',
          message: ''
        }
    }
  }

  useEffect(() => {
    if (admin) {
      fetchUsersWithNotifications()
    }
  }, [admin])

  useEffect(() => {
    // Auto-fill templates when notification type changes
    if (bulkNotification.notificationType !== 'custom') {
      const template = getNotificationTemplate(bulkNotification.notificationType)
      setBulkNotification(prev => ({
        ...prev,
        subject: template.subject,
        message: template.message
      }))
    }
  }, [bulkNotification.notificationType])

  const fetchUsersWithNotifications = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all users
      const usersRes = await fetch('/api/users')
      if (!usersRes.ok) throw new Error('Failed to fetch users')
      const usersData = await usersRes.json()

      // Fetch notification settings and contacts for each user
      const usersWithNotifications = await Promise.all(
        usersData.map(async (user: User) => {
          try {
            const [contactsRes, notificationsRes] = await Promise.all([
              fetch(`/api/users/${user.Id}/contacts`),
              fetch(`/api/users/${user.Id}/notifications`)
            ])

            const contacts = contactsRes.ok ? await contactsRes.json() : {}
            const notificationSettings = notificationsRes.ok ? await notificationsRes.json() : {
              emailEnabled: false,
              discordEnabled: false,
              slackEnabled: false,
              telegramEnabled: false,
              webhookEnabled: false,
              expiryWarnings: true
            }

            return {
              ...user,
              contacts,
              notificationSettings
            }
          } catch (err) {
            console.error(`Failed to fetch data for user ${user.Id}:`, err)
            return {
              ...user,
              contacts: {},
              notificationSettings: {
                emailEnabled: false,
                discordEnabled: false,
                slackEnabled: false,
                telegramEnabled: false,
                webhookEnabled: false,
                expiryWarnings: true
              }
            }
          }
        })
      )

      setUsers(usersWithNotifications)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const updateUserNotificationSettings = async (userId: string, settings: NotificationSettings) => {
    try {
      const response = await fetch(`/api/users/${userId}/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) throw new Error('Failed to update settings')

      // Update local state
      setUsers(prev => prev.map(user =>
        user.Id === userId
          ? { ...user, notificationSettings: settings }
          : user
      ))

      setSuccess(true)
      setHasUnsavedChanges(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification settings')
    }
  }

  const sendBulkNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const targetUsers = bulkNotification.sendToAll
        ? users.map(u => u.Id)
        : bulkNotification.selectedUsers

      if (targetUsers.length === 0) {
        throw new Error('No users selected')
      }

      // Send notification to each selected user
      const promises = targetUsers.map(userId =>
        fetch('/api/notifications/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            subject: bulkNotification.subject,
            message: bulkNotification.message,
            type: bulkNotification.notificationType
          })
        })
      )

      const results = await Promise.allSettled(promises)
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.length - successCount

      if (successCount > 0) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000)
        alert(`Notifications sent successfully to ${successCount} users${failCount > 0 ? ` (${failCount} failed)` : ''}`)
      } else {
        throw new Error('All notifications failed to send')
      }

      // Reset form
      setBulkNotification({
        subject: '',
        message: '',
        sendToAll: false,
        selectedUsers: [],
        notificationType: 'custom'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send bulk notifications')
    } finally {
      setSaving(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setBulkNotification(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }))
  }

  const sendTestNotification = async (userId: string) => {
    if (!confirm('Send a test notification to this user?')) return

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject: 'Test Notification',
          message: 'This is a test notification to verify your notification settings are working correctly.'
        })
      })

      if (response.ok) {
        alert('Test notification sent successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to send test notification: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
      alert('Failed to send test notification')
    }
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="p-4 max-w-4xl mx-auto">
          <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded">
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
          <div className="text-center text-slate-200">Loading notification settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="p-4 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Notification Management</h1>
          <p className="text-sm sm:text-base text-slate-400">Manage notification settings and send bulk notifications to users</p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded mb-6">{error}</div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 text-green-200 p-4 rounded mb-6">
            Operation completed successfully
          </div>
        )}

        {/* Bulk Notification Form */}
        <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-white">Send Bulk Notification</h2>
          <form onSubmit={sendBulkNotification} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Notification Type
                </label>
                <select
                  value={bulkNotification.notificationType}
                  onChange={(e) => setBulkNotification(prev => ({
                    ...prev,
                    notificationType: e.target.value as any
                  }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  aria-label="Notification type for bulk notification"
                >
                  <option value="custom">Custom Message</option>
                  <option value="welcome">Welcome Message</option>
                  <option value="expiry_warning">Expiry Warning</option>
                  <option value="account_disabled">Account Disabled</option>
                  <option value="invite_used">Invite Used</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Templates auto-fill subject and message fields</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Recipients
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={bulkNotification.sendToAll}
                      onChange={(e) => setBulkNotification(prev => ({
                        ...prev,
                        sendToAll: e.target.checked,
                        selectedUsers: e.target.checked ? [] : prev.selectedUsers
                      }))}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-600 rounded bg-slate-700 accent-orange-500"
                    />
                    <span className="ml-2 text-sm text-slate-200">Send to all users</span>
                  </label>
                  {!bulkNotification.sendToAll && (
                    <div className="text-sm text-slate-400">
                      Or select specific users below ({bulkNotification.selectedUsers.length} selected)
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={bulkNotification.subject}
                onChange={(e) => setBulkNotification(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Notification subject"
                aria-label="Notification subject line"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Message
              </label>
              <textarea
                value={bulkNotification.message}
                onChange={(e) => setBulkNotification(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Notification message"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving || (!bulkNotification.sendToAll && bulkNotification.selectedUsers.length === 0)}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:bg-slate-600"
            >
              {saving ? 'Sending...' : `Send to ${bulkNotification.sendToAll ? 'All Users' : `${bulkNotification.selectedUsers.length} Selected Users`}`}
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">User Notification Settings</h2>
              <p className="text-sm text-slate-400">Manage notification preferences for each user</p>
            </div>
            {hasUnsavedChanges && (
              <button
                onClick={() => setHasUnsavedChanges(false)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 w-full sm:w-auto text-center"
              >
                Settings Updated
              </button>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  {!bulkNotification.sendToAll && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                      Select
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                    Contacts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                    Discord
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                    Slack
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                    Telegram
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                    Webhook
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                    Expiry Warnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {users.map((user) => (
                  <tr key={user.Id} className={`transition-colors ${user.Policy?.IsDisabled ? 'bg-slate-900 opacity-60' : 'hover:bg-slate-700'}`}>
                    {!bulkNotification.sendToAll && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={bulkNotification.selectedUsers.includes(user.Id)}
                          onChange={() => toggleUserSelection(user.Id)}
                          disabled={user.Policy?.IsDisabled}
                          className="h-4 w-4 accent-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-orange-500"
                          aria-label={`Select ${user.Name} for bulk notification`}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-white">{user.Name}</div>
                        </div>
                        {user.Policy?.IsAdministrator && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200">
                            Admin
                          </span>
                        )}
                        {user.Policy?.IsDisabled && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200">
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                      <div>
                        {user.contacts.email && <div>📧 {user.contacts.email}</div>}
                        {user.contacts.discordUsername && <div>💬 {user.contacts.discordUsername}</div>}
                        {!user.contacts.email && !user.contacts.discordUsername && (
                          <span className="text-slate-500">No contacts</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={user.notificationSettings.emailEnabled}
                        onChange={(e) => updateUserNotificationSettings(user.Id, {
                          ...user.notificationSettings,
                          emailEnabled: e.target.checked
                        })}
                        disabled={!user.contacts.email || user.Policy?.IsDisabled}
                        className="h-4 w-4 accent-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        aria-label={`Enable email notifications for ${user.Name}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={user.notificationSettings.discordEnabled}
                        onChange={(e) => updateUserNotificationSettings(user.Id, {
                          ...user.notificationSettings,
                          discordEnabled: e.target.checked
                        })}
                        disabled={!user.contacts.discordUsername || user.Policy?.IsDisabled}
                        className="h-4 w-4 accent-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        aria-label={`Enable Discord notifications for ${user.Name}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={user.notificationSettings.expiryWarnings}
                        onChange={(e) => updateUserNotificationSettings(user.Id, {
                          ...user.notificationSettings,
                          expiryWarnings: e.target.checked
                        })}
                        disabled={user.Policy?.IsDisabled}
                        className="h-4 w-4 accent-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        aria-label={`Enable expiry warning notifications for ${user.Name}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="space-x-2">
                        <button
                          onClick={() => sendTestNotification(user.Id)}
                          disabled={user.Policy?.IsDisabled}
                          className="text-green-400 hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Send test notification"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => window.open(`/users/${user.Id}`, '_blank')}
                          className="text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-700">
            {users.map((user) => (
              <div key={user.Id} className={`p-4 ${user.Policy?.IsDisabled ? 'bg-slate-900 opacity-60' : ''}`}>
                {/* User header with selection */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {!bulkNotification.sendToAll && (
                      <input
                        type="checkbox"
                        checked={bulkNotification.selectedUsers.includes(user.Id)}
                        onChange={() => toggleUserSelection(user.Id)}
                        disabled={user.Policy?.IsDisabled}
                        className="h-4 w-4 accent-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-orange-500"
                        aria-label={`Select ${user.Name} for bulk notification on mobile`}
                      />
                    )}
                    <span className="text-sm font-medium text-white">{user.Name}</span>
                    {user.Policy?.IsAdministrator && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200">
                        Admin
                      </span>
                    )}
                    {user.Policy?.IsDisabled && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>

                {/* Contacts */}
                <div className="mb-3 text-xs text-slate-300 flex flex-wrap gap-1">
                  {user.contacts.email && <span className="bg-slate-700 px-2 py-1 rounded">📧 {user.contacts.email}</span>}
                  {user.contacts.discordUsername && <span className="bg-slate-700 px-2 py-1 rounded">💬 Discord: {user.contacts.discordUsername}</span>}
                  {!user.contacts.email && !user.contacts.discordUsername && (
                    <span className="text-slate-500">No contacts configured</span>
                  )}
                </div>

                {/* Notification toggles in a grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <label className={`flex items-center gap-2 p-2 rounded-lg ${user.contacts.email ? 'bg-slate-700' : 'bg-slate-800'}`}>
                    <input
                      type="checkbox"
                      checked={user.notificationSettings.emailEnabled}
                      onChange={(e) => updateUserNotificationSettings(user.Id, {
                        ...user.notificationSettings,
                        emailEnabled: e.target.checked
                      })}
                      disabled={!user.contacts.email || user.Policy?.IsDisabled}
                      className="h-4 w-4 accent-orange-500 disabled:opacity-50"
                    />
                    <span className="text-xs text-slate-300">Email</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2 rounded-lg ${user.contacts.discordUsername ? 'bg-slate-700' : 'bg-slate-800'}`}>
                    <input
                      type="checkbox"
                      checked={user.notificationSettings.discordEnabled}
                      onChange={(e) => updateUserNotificationSettings(user.Id, {
                        ...user.notificationSettings,
                        discordEnabled: e.target.checked
                      })}
                      disabled={!user.contacts.discordUsername || user.Policy?.IsDisabled}
                      className="h-4 w-4 accent-orange-500 disabled:opacity-50"
                    />
                    <span className="text-xs text-slate-300">Discord</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-700">
                    <input
                      type="checkbox"
                      checked={user.notificationSettings.expiryWarnings}
                      onChange={(e) => updateUserNotificationSettings(user.Id, {
                        ...user.notificationSettings,
                        expiryWarnings: e.target.checked
                      })}
                      disabled={user.Policy?.IsDisabled}
                      className="h-4 w-4 accent-orange-500 disabled:opacity-50"
                    />
                    <span className="text-xs text-slate-300">Expiry</span>
                  </label>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => sendTestNotification(user.Id)}
                    disabled={user.Policy?.IsDisabled}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Test
                  </button>
                  <button
                    onClick={() => window.open(`/users/${user.Id}`, '_blank')}
                    className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification History */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg mt-6">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Recent Notifications</h2>
            <p className="text-slate-400">View recent notification activity (feature coming soon)</p>
          </div>
          <div className="px-6 py-8 text-center text-slate-400">
            <p>Notification history and delivery status tracking will be available in a future update.</p>
            <p className="text-sm mt-2">This will show sent notifications, delivery status, and allow retrying failed notifications.</p>
          </div>
        </div>
      </div>
    </div>
  )
}