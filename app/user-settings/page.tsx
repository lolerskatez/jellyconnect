"use client"

import { useState } from "react"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"
import { useRouter } from "next/navigation"

interface NotificationPreferences {
  emailNotifications: boolean
  discordNotifications: boolean
  webNotifications: boolean
}

interface AccountInfo {
  email: string
  displayName: string
}

interface NotificationContacts {
  emailAddress: string
  discordUsername: string
  telegramUsername: string
}

export default function UserSettingsPage() {
  const { admin } = useAuth()
  const router = useRouter()
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    email: '',
    displayName: admin?.name || '',
  })
  const [notificationContacts, setNotificationContacts] = useState<NotificationContacts>({
    emailAddress: '',
    discordUsername: '',
    telegramUsername: '',
  })
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    emailNotifications: true,
    discordNotifications: false,
    webNotifications: true,
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

  const handleSaveNotificationContacts = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('/api/users/' + admin.id + '/notification-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationContacts)
      })

      if (res.ok) {
        setSuccess('Notification contacts saved successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save notification contacts')
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account preferences and security</p>
          </div>

          <div className="px-6 py-8">
            {/* Account Information */}
            <div className="mb-10 pb-8 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
              <form onSubmit={handleSaveAccountInfo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={accountInfo.displayName}
                    onChange={(e) => setAccountInfo({...accountInfo, displayName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={accountInfo.email}
                    onChange={(e) => setAccountInfo({...accountInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {loading ? 'Saving...' : 'Save Account Information'}
                </button>
              </form>
            </div>

            {/* Notification Preferences */}
            <div className="mb-10 pb-8 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
              
              {/* Notification Methods */}
              <div className="mb-8 pb-8 border-b border-gray-100">
                <h3 className="text-md font-medium text-gray-900 mb-4">Notification Contacts</h3>
                <form onSubmit={handleSaveNotificationContacts} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={notificationContacts.emailAddress}
                      onChange={(e) => setNotificationContacts({...notificationContacts, emailAddress: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="notifications@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discord Username
                    </label>
                    <input
                      type="text"
                      value={notificationContacts.discordUsername}
                      onChange={(e) => setNotificationContacts({...notificationContacts, discordUsername: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your_discord_username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telegram Username
                    </label>
                    <input
                      type="text"
                      value={notificationContacts.telegramUsername}
                      onChange={(e) => setNotificationContacts({...notificationContacts, telegramUsername: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your_telegram_username"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    {loading ? 'Saving...' : 'Save Notification Contacts'}
                  </button>
                </form>
              </div>

              {/* Notification Toggle Switches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="font-medium text-gray-900">Email Notifications</label>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.emailNotifications}
                    onChange={() => handleNotificationChange('emailNotifications')}
                    className="w-5 h-5 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="font-medium text-gray-900">Discord Notifications</label>
                    <p className="text-sm text-gray-600">Receive notifications on Discord</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.discordNotifications}
                    onChange={() => handleNotificationChange('discordNotifications')}
                    className="w-5 h-5 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="font-medium text-gray-900">Web Notifications</label>
                    <p className="text-sm text-gray-600">Receive notifications in the app</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.webNotifications}
                    onChange={() => handleNotificationChange('webNotifications')}
                    className="w-5 h-5 rounded"
                  />
                </div>

                <button
                  onClick={handleSaveNotifications}
                  disabled={loading}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Save Preferences
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div className="mb-10">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your new password (min 8 characters)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm your new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
