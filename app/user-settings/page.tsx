"use client"

import { useState } from "react"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"
import { useRouter } from "next/navigation"

interface NotificationPreferences {
  // Channel toggles
  emailNotifications: boolean
  discordNotifications: boolean
  // Notification type preferences
  welcomeNotifications: boolean
  expiryWarnings: boolean
  accountAlerts: boolean
  systemAlerts: boolean
}

interface AccountInfo {
  email: string
  displayName: string
  discordUsername: string
}

interface NotificationContacts {
  emailAddress: string
}

export default function UserSettingsPage() {
  const { admin } = useAuth()
  const router = useRouter()
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    email: '',
    displayName: admin?.name || '',
    discordUsername: '',
  })
  const [notificationContacts, setNotificationContacts] = useState<NotificationContacts>({
    emailAddress: '',
  })
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    emailNotifications: true,
    discordNotifications: false,
    welcomeNotifications: true,
    expiryWarnings: true,
    accountAlerts: true,
    systemAlerts: true,
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!admin) {
    return null
  }

  const handleNotificationChange = (key: keyof NotificationPreferences) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSaveAccountInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!accountInfo.displayName) {
      setError('Display name is required')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/users/' + admin.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: accountInfo.displayName,
          email: accountInfo.email
        })
      })

      if (res.ok) {
        setSuccess('Account information updated successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update account information')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Validation
    if (!passwordForm.currentPassword) {
      setError('Current password is required')
      setLoading(false)
      return
    }
    if (!passwordForm.newPassword) {
      setError('New password is required')
      setLoading(false)
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      setLoading(false)
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/users/' + admin.id + '/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      if (res.ok) {
        setSuccess('Password changed successfully')
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to change password')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/' + admin.id + '/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPrefs)
      })

      if (res.ok) {
        setSuccess('Notification preferences saved')
      } else {
        setError('Failed to save preferences')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-900 border border-green-700 rounded-lg">
            <p className="text-green-200">{success}</p>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-700">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Account Settings</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">Manage your account preferences and security</p>
          </div>

          <div className="px-4 sm:px-6 py-6 sm:py-8">
            {/* Account Information */}
            <div className="mb-10 pb-8 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
              <form onSubmit={handleSaveAccountInfo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={accountInfo.displayName}
                    onChange={(e) => setAccountInfo({...accountInfo, displayName: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Your display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={accountInfo.email}
                    onChange={(e) => setAccountInfo({...accountInfo, email: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Discord Username
                  </label>
                  <input
                    type="text"
                    value={accountInfo.discordUsername}
                    onChange={(e) => setAccountInfo({...accountInfo, discordUsername: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="your_discord_username"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Used for Discord direct message notifications (if Discord is enabled on the server)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-all"
                >
                  {loading ? 'Saving...' : 'Save Account Information'}
                </button>
              </form>
            </div>

            {/* Notification Preferences */}
            <div className="mb-10 pb-8 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4">Notification Preferences</h2>
              
              {/* Channel Toggles */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-slate-200 mb-4">Notification Channels</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <label className="font-medium text-white">Email Notifications</label>
                      <p className="text-sm text-slate-400">Receive notifications via email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.emailNotifications}
                      onChange={() => handleNotificationChange('emailNotifications')}
                      className="w-5 h-5 rounded accent-orange-500 bg-slate-600 border-slate-500"
                      aria-label="Enable or disable email notifications"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <label className="font-medium text-white">Discord Notifications</label>
                      <p className="text-sm text-slate-400">Receive direct messages on Discord</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.discordNotifications}
                      onChange={() => handleNotificationChange('discordNotifications')}
                      className="w-5 h-5 rounded accent-orange-500 bg-slate-600 border-slate-500"
                      aria-label="Enable or disable Discord notifications"
                    />
                  </div>
                </div>
              </div>

              {/* Notification Types */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-slate-200 mb-4">Notification Types</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <label className="font-medium text-white">Welcome Messages</label>
                      <p className="text-sm text-slate-400">Receive welcome notifications when your account is created</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.welcomeNotifications}
                      onChange={() => handleNotificationChange('welcomeNotifications')}
                      className="w-5 h-5 rounded accent-orange-500 bg-slate-600 border-slate-500"
                      aria-label="Enable or disable welcome message notifications"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <label className="font-medium text-white">Account Expiry Warnings</label>
                      <p className="text-sm text-slate-400">Get notified before your account expires</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.expiryWarnings}
                      onChange={() => handleNotificationChange('expiryWarnings')}
                      aria-label="Enable or disable account expiry warning notifications"
                      className="w-5 h-5 rounded accent-orange-500 bg-slate-600 border-slate-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <label className="font-medium text-white">Account Alerts</label>
                      <p className="text-sm text-slate-400">Notifications about account status changes</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.accountAlerts}
                      onChange={() => handleNotificationChange('accountAlerts')}
                      aria-label="Enable or disable account alert notifications"
                      className="w-5 h-5 rounded accent-orange-500 bg-slate-600 border-slate-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <label className="font-medium text-white">System Alerts</label>
                      <p className="text-sm text-slate-400">Important system-wide announcements</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.systemAlerts}
                      onChange={() => handleNotificationChange('systemAlerts')}
                      aria-label="Enable or disable system alert notifications"
                      className="w-5 h-5 rounded accent-orange-500 bg-slate-600 border-slate-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveNotifications}
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                Save Notification Preferences
              </button>
            </div>

            {/* Change Password */}
            <div className="mb-10">
              <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter your new password (min 8 characters)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Confirm your new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-all"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="w-full sm:w-auto border border-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
