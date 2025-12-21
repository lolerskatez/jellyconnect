"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "../../providers"
import Navigation from "../../components/Navigation"

interface UserPolicy {
  IsAdministrator: boolean
  IsHidden: boolean
  IsDisabled: boolean
  EnableCollectionManagement: boolean
  EnableSubtitleManagement: boolean
  EnableLyricManagement: boolean
  EnableContentDeletion: boolean
  EnableContentDeletionFromFolders: any[]
  EnableContentDownloading: boolean
  EnableMediaPlayback: boolean
  EnableAudioPlaybackTranscoding: boolean
  EnableVideoPlaybackTranscoding: boolean
  EnablePlaybackRemuxing: boolean
  EnableAllFolders: boolean
  EnableAllChannels: boolean
  EnableAllDevices: boolean
  EnableRemoteAccess: boolean
  EnableLiveTvAccess: boolean
  EnableLiveTvManagement?: boolean
  EnablePublicSharing: boolean
  EnableSyncTranscoding: boolean
  EnableMediaConversion: boolean
  MaxParentalRating: any
  BlockUnratedItems: any[]
  BlockedTags: any[]
  AllowedTags: any[]
  EnableUserPreferenceAccess: boolean
  AccessSchedules: any[]
  InvalidLoginAttemptCount: number
  LoginAttemptsBeforeLockout: number
  MaxActiveSessions: number
  RemoteClientBitrateLimit: number
  SyncPlayAccess: string
  EnableRemoteControlOfOtherUsers?: boolean
  EnableSharedDeviceControl?: boolean
  ForceRemoteSourceTranscoding?: boolean
}

const ROLE_PRESETS = {
  user: {
    label: "User",
    description: "Basic access: Can play media, no deletion or management permissions.",
    policy: {
      IsAdministrator: false,
      IsHidden: false,
      IsDisabled: false,
      EnableCollectionManagement: false,
      EnableSubtitleManagement: false,
      EnableLyricManagement: false,
      EnableContentDeletion: false,
      EnableContentDeletionFromFolders: [],
      EnableContentDownloading: true,
      EnableMediaPlayback: true,
      EnableAudioPlaybackTranscoding: true,
      EnableVideoPlaybackTranscoding: true,
      EnablePlaybackRemuxing: true,
      EnableAllFolders: true,
      EnableAllChannels: true,
      EnableAllDevices: true,
      EnableRemoteAccess: true,
      EnableLiveTvAccess: true,
      EnablePublicSharing: false,
      EnableSyncTranscoding: false,
      EnableMediaConversion: false,
      MaxParentalRating: null,
      BlockUnratedItems: [],
      BlockedTags: [],
      AllowedTags: [],
      EnableUserPreferenceAccess: true,
      AccessSchedules: [],
      InvalidLoginAttemptCount: 0,
      LoginAttemptsBeforeLockout: 0,
      MaxActiveSessions: 0,
      RemoteClientBitrateLimit: 0,
      SyncPlayAccess: "None"
    },
  },
  powerUser: {
    label: "Power User",
    description: "Advanced access: Can delete media, manage subtitles, access all libraries.",
    policy: {
      IsAdministrator: false,
      IsHidden: false,
      IsDisabled: false,
      EnableCollectionManagement: true,
      EnableSubtitleManagement: true,
      EnableLyricManagement: true,
      EnableContentDeletion: true,
      EnableContentDeletionFromFolders: [],
      EnableContentDownloading: true,
      EnableMediaPlayback: true,
      EnableAudioPlaybackTranscoding: true,
      EnableVideoPlaybackTranscoding: true,
      EnablePlaybackRemuxing: true,
      EnableAllFolders: true,
      EnableAllChannels: true,
      EnableAllDevices: true,
      EnableRemoteAccess: true,
      EnableLiveTvAccess: true,
      EnableLiveTvManagement: false,
      EnablePublicSharing: true,
      EnableSyncTranscoding: true,
      EnableMediaConversion: true,
      MaxParentalRating: null,
      BlockUnratedItems: [],
      BlockedTags: [],
      AllowedTags: [],
      EnableUserPreferenceAccess: true,
      AccessSchedules: [],
      InvalidLoginAttemptCount: 0,
      LoginAttemptsBeforeLockout: 0,
      MaxActiveSessions: 0,
      RemoteClientBitrateLimit: 0,
      SyncPlayAccess: "JoinGroups"
    },
  },
  admin: {
    label: "Administrator",
    description: "Full access: All permissions including user management and server administration.",
    policy: {
      IsAdministrator: true,
      IsHidden: false,
      IsDisabled: false,
      EnableCollectionManagement: true,
      EnableSubtitleManagement: true,
      EnableLyricManagement: true,
      EnableContentDeletion: true,
      EnableContentDeletionFromFolders: [],
      EnableContentDownloading: true,
      EnableMediaPlayback: true,
      EnableAudioPlaybackTranscoding: true,
      EnableVideoPlaybackTranscoding: true,
      EnablePlaybackRemuxing: true,
      ForceRemoteSourceTranscoding: true,
      EnableAllFolders: true,
      EnableAllChannels: true,
      EnableAllDevices: true,
      EnableRemoteAccess: true,
      EnableLiveTvManagement: true,
      EnableLiveTvAccess: true,
      EnableRemoteControlOfOtherUsers: true,
      EnableSharedDeviceControl: true,
      EnablePublicSharing: true,
      EnableSyncTranscoding: true,
      EnableMediaConversion: true,
      MaxParentalRating: null,
      BlockUnratedItems: [],
      BlockedTags: [],
      AllowedTags: [],
      EnableUserPreferenceAccess: true,
      AccessSchedules: [],
      InvalidLoginAttemptCount: 0,
      LoginAttemptsBeforeLockout: 0,
      MaxActiveSessions: 0,
      RemoteClientBitrateLimit: 0,
      SyncPlayAccess: "CreateAndJoinGroups"
    },
  },
}

export default function UserDetailPageClient() {
  const router = useRouter()
  const params = useParams()
  const { admin } = useAuth()
  const userId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [contacts, setContacts] = useState<{displayName?: string; email?: string; discordId?: string; slackId?: string; telegramId?: string; webhookUrl?: string}>({})
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: false,
    discordEnabled: false,
    slackEnabled: false,
    telegramEnabled: false,
    webhookEnabled: false,
    expiryWarnings: true
  })
  const [expiryDate, setExpiryDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/users/${userId}`)
      if (!res.ok) throw new Error("Failed to fetch user")
      const data = await res.json()
      setUser(data)
      setExpiryDate(data.expiresAt ? new Date(data.expiresAt).toISOString().split('T')[0] : '')

      // Fetch contacts
      try {
        const contactsRes = await fetch(`/api/users/${userId}/contacts`)
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json()
          setContacts(contactsData)
        }
      } catch (contactsErr) {
        console.error('Failed to fetch contacts:', contactsErr)
      }

      // Fetch notification settings
      try {
        const notificationsRes = await fetch(`/api/users/${userId}/notifications`)
        if (notificationsRes.ok) {
          const notificationsData = await notificationsRes.json()
          setNotificationSettings(notificationsData)
        }
      } catch (notificationsErr) {
        console.error('Failed to fetch notification settings:', notificationsErr)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch user")
    } finally {
      setLoading(false)
    }
  }

  const getUserRole = (): keyof typeof ROLE_PRESETS => {
    if (!user?.Policy) return "user"
    if (user.Policy.IsAdministrator) return "admin"
    if (user.Policy.EnableContentDeletion && user.Policy.EnableAllFolders)
      return "powerUser"
    return "user"
  }

  const applyRolePreset = async (role: keyof typeof ROLE_PRESETS) => {
    if (!user) return

    // Prevent admin from changing their own role to avoid lockout
    if (admin?.id === userId) {
      setError("You cannot change your own user role to prevent admin lockout.")
      return
    }

    try {
      setSaving(true)
      setError(null)
      const preset = ROLE_PRESETS[role]
      const res = await fetch(`/api/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preset.policy),
      })
      if (!res.ok) throw new Error("Failed to update user role")
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await fetchUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user role")
    } finally {
      setSaving(false)
    }
  }

  const toggleDisabled = async () => {
    if (!user?.Policy) return

    // Prevent admin from disabling their own account
    if (admin?.id === userId) {
      setError("You cannot disable your own account to prevent admin lockout.")
      return
    }

    try {
      setSaving(true)
      setError(null)
      const res = await fetch(`/api/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...user.Policy,
          IsDisabled: !user.Policy.IsDisabled,
        }),
      })
      if (!res.ok) throw new Error("Failed to update user")
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await fetchUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user")
    } finally {
      setSaving(false)
    }
  }

  const updateNotifications = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/users/${userId}/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      })

      if (!res.ok) throw new Error('Failed to update notification settings')

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification settings')
    } finally {
      setSaving(false)
    }
  }

  const testNotification = async () => {
    try {
      const response = await fetch(`/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          type: 'test',
        }),
      });

      if (response.ok) {
        alert('Test notification sent successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to send test notification: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Error sending test notification. Check console for details.');
    }
  };

  const updateExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/users/${userId}/expiry`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: expiryDate || null })
      });

      if (!res.ok) throw new Error('Failed to update expiry date');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await fetchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expiry date');
    } finally {
      setSaving(false);
    }
  };

  const updateContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/users/${userId}/contacts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contacts)
      });

      if (!res.ok) throw new Error('Failed to update contact information');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading user...</div>
  if (!user) return <div className="p-4 text-red-600">User not found</div>

  const currentRole = getUserRole()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="p-4 max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="text-orange-400 hover:text-orange-300 mb-4 transition-colors"
      >
        ← Back
      </button>

      <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">User Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-slate-400">Username:</span>
            <p className="mt-1 text-white">{user.Name}</p>
          </div>
          <div>
            <span className="font-medium text-slate-400">User ID:</span>
            <p className="mt-1 font-mono text-xs text-slate-200">{user.Id}</p>
          </div>
          <div>
            <span className="font-medium text-slate-400">Last Login:</span>
            <p className="mt-1 text-slate-200">
              {user.LastLoginDate ? new Date(user.LastLoginDate).toLocaleString() : 'Never'}
            </p>
          </div>
          <div>
            <span className="font-medium text-slate-400">Last Activity:</span>
            <p className="mt-1 text-slate-200">
              {user.LastActivityDate ? new Date(user.LastActivityDate).toLocaleString() : 'Never'}
            </p>
          </div>
          <div>
            <span className="font-medium text-slate-400">Has Password:</span>
            <p className="mt-1 text-slate-200">{user.HasPassword ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <span className="font-medium text-slate-400">Auto Login:</span>
            <p className="mt-1 text-slate-200">{user.EnableAutoLogin ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Contact Information</h2>
        <form onSubmit={updateContacts} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-200">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={contacts.displayName || ''}
              onChange={(e) => setContacts({...contacts, displayName: e.target.value})}
              className="mt-1 appearance-none relative block w-full px-3 py-2 bg-slate-700 border border-slate-600 placeholder-slate-400 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm"
              placeholder="Enter display name"
            />
            <p className="mt-1 text-xs text-slate-400">
              Friendly name for display in the UI (defaults to Jellyfin username if not set)
            </p>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-200">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={contacts.email || ''}
              onChange={(e) => setContacts({...contacts, email: e.target.value})}
              className="mt-1 appearance-none relative block w-full px-3 py-2 bg-slate-700 border border-slate-600 placeholder-slate-400 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label htmlFor="discordId" className="block text-sm font-medium text-slate-200">
              Discord Username
            </label>
            <input
              id="discordId"
              type="text"
              value={contacts.discordId || ''}
              onChange={(e) => setContacts({...contacts, discordId: e.target.value})}
              className="mt-1 appearance-none relative block w-full px-3 py-2 bg-slate-700 border border-slate-600 placeholder-slate-400 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm"
              placeholder="username#1234 or username"
            />
            <p className="mt-1 text-xs text-slate-400">
              Discord username with or without discriminator
            </p>
          </div>
          <div>
            <label htmlFor="slackId" className="block text-sm font-medium text-slate-200">
              Slack User ID
            </label>
            <input
              id="slackId"
              type="text"
              value={contacts.slackId || ''}
              onChange={(e) => setContacts({...contacts, slackId: e.target.value})}
              className="mt-1 appearance-none relative block w-full px-3 py-2 bg-slate-700 border border-slate-600 placeholder-slate-400 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm"
              placeholder="U1234567890"
            />
            <p className="mt-1 text-xs text-slate-400">
              Slack user ID (starts with U followed by numbers)
            </p>
          </div>
          <div>
            <label htmlFor="telegramId" className="block text-sm font-medium text-slate-200">
              Telegram Username
            </label>
            <input
              id="telegramId"
              type="text"
              value={contacts.telegramId || ''}
              onChange={(e) => setContacts({...contacts, telegramId: e.target.value})}
              className="mt-1 appearance-none relative block w-full px-3 py-2 bg-slate-700 border border-slate-600 placeholder-slate-400 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm"
              placeholder="@username or username"
            />
            <p className="mt-1 text-xs text-slate-400">
              Telegram username with or without @
            </p>
          </div>
          <div>
            <label htmlFor="webhookUrl" className="block text-sm font-medium text-slate-200">
              Webhook URL
            </label>
            <input
              id="webhookUrl"
              type="url"
              value={contacts.webhookUrl || ''}
              onChange={(e) => setContacts({...contacts, webhookUrl: e.target.value})}
              className="mt-1 appearance-none relative block w-full px-3 py-2 bg-slate-700 border border-slate-600 placeholder-slate-400 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm"
              placeholder="https://example.com/webhook"
            />
            <p className="mt-1 text-xs text-slate-400">
              HTTP/HTTPS webhook URL for custom notifications
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
          >
            {saving ? 'Saving...' : 'Update Contacts'}
          </button>
        </form>
      </div>

      <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Notification Settings</h2>
        <form onSubmit={updateNotifications} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="emailEnabled"
                type="checkbox"
                checked={notificationSettings.emailEnabled}
                onChange={(e) => setNotificationSettings({...notificationSettings, emailEnabled: e.target.checked})}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-600 rounded bg-slate-700 accent-orange-500"
              />
              <label htmlFor="emailEnabled" className="ml-2 block text-sm text-slate-200">
                📧 Enable email notifications
                {!contacts.email && <span className="text-slate-500 ml-1">(requires email address)</span>}
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="discordEnabled"
                type="checkbox"
                checked={notificationSettings.discordEnabled}
                onChange={(e) => setNotificationSettings({...notificationSettings, discordEnabled: e.target.checked})}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-600 rounded bg-slate-700 accent-orange-500"
              />
              <label htmlFor="discordEnabled" className="ml-2 block text-sm text-slate-200">
                💬 Enable Discord notifications
                {!contacts.discordId && <span className="text-slate-500 ml-1">(requires Discord username)</span>}
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="slackEnabled"
                type="checkbox"
                checked={notificationSettings.slackEnabled}
                onChange={(e) => setNotificationSettings({...notificationSettings, slackEnabled: e.target.checked})}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-600 rounded bg-slate-700 accent-orange-500"
              />
              <label htmlFor="slackEnabled" className="ml-2 block text-sm text-slate-200">
                💬 Enable Slack notifications
                {!contacts.slackId && <span className="text-slate-500 ml-1">(requires Slack user ID)</span>}
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="telegramEnabled"
                type="checkbox"
                checked={notificationSettings.telegramEnabled}
                onChange={(e) => setNotificationSettings({...notificationSettings, telegramEnabled: e.target.checked})}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-600 rounded bg-slate-700 accent-orange-500"
              />
              <label htmlFor="telegramEnabled" className="ml-2 block text-sm text-slate-200">
                ✈️ Enable Telegram notifications
                {!contacts.telegramId && <span className="text-slate-500 ml-1">(requires Telegram username)</span>}
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="webhookEnabled"
                type="checkbox"
                checked={notificationSettings.webhookEnabled}
                onChange={(e) => setNotificationSettings({...notificationSettings, webhookEnabled: e.target.checked})}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-600 rounded bg-slate-700 accent-orange-500"
              />
              <label htmlFor="webhookEnabled" className="ml-2 block text-sm text-slate-200">
                🔗 Enable webhook notifications
                {!contacts.webhookUrl && <span className="text-slate-500 ml-1">(requires webhook URL)</span>}
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="expiryWarnings"
                type="checkbox"
                checked={notificationSettings.expiryWarnings}
                onChange={(e) => setNotificationSettings({...notificationSettings, expiryWarnings: e.target.checked})}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-600 rounded bg-slate-700 accent-orange-500"
              />
              <label htmlFor="expiryWarnings" className="ml-2 block text-sm text-slate-200">
                ⚠️ Send expiry warnings
              </label>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {saving ? 'Saving...' : 'Update Notification Settings'}
            </button>

            <button
              type="button"
              onClick={testNotification}
              disabled={saving || (!notificationSettings.emailEnabled && !notificationSettings.discordEnabled && !notificationSettings.slackEnabled && !notificationSettings.telegramEnabled && !notificationSettings.webhookEnabled)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:bg-slate-600"
            >
              Test Notification
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Account Expiry</h2>
        <form onSubmit={updateExpiry} className="space-y-4">
          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-slate-200">
              Expiry Date
            </label>
            <input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">
              Leave empty for no expiry. User will receive warnings before expiry if notifications are enabled.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
          >
            {saving ? 'Saving...' : 'Update Expiry Date'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-900 border border-green-700 text-green-200 p-3 rounded mb-4">
          User updated successfully
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">User Status</h2>
        <div className="mb-4">
          <p className="text-slate-400 mb-2">Current Status:</p>
          {user.Policy?.IsDisabled ? (
            <span className="px-3 py-1 bg-red-900 text-red-200 rounded">
              Disabled
            </span>
          ) : (
            <span className="px-3 py-1 bg-green-900 text-green-200 rounded">
              Active
            </span>
          )}
        </div>
        <button
          onClick={toggleDisabled}
          disabled={saving || admin?.id === userId}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
        >
          {user.Policy?.IsDisabled ? "Enable User" : "Disable User"}
        </button>
        {admin?.id === userId && (
          <p className="text-xs text-slate-400 mt-2">
            You cannot disable your own account to prevent admin lockout.
          </p>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">User Role</h2>
        <p className="text-slate-400 mb-4">
          Current role: <strong className="text-white">{ROLE_PRESETS[currentRole].label}</strong>
        </p>

        {admin?.id === userId && (
          <div className="bg-yellow-900 border border-yellow-700 rounded p-3 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-200">
                  Role Change Restricted
                </h3>
                <div className="mt-2 text-sm text-yellow-300">
                  <p>You cannot change your own user role to prevent admin lockout. Contact another administrator to modify your role if needed.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {(Object.entries(ROLE_PRESETS) as Array<[keyof typeof ROLE_PRESETS, any]>).map(
            ([key, preset]) => (
              <button
                key={key}
                onClick={() => applyRolePreset(key)}
                disabled={saving || currentRole === key || admin?.id === userId}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  currentRole === key
                    ? "border-orange-500 bg-orange-900/30"
                    : "border-slate-700 hover:border-slate-600 bg-slate-700/50"
                } disabled:opacity-50`}
              >
                <div className="font-bold text-white">{preset.label}</div>
                <div className="text-sm text-slate-400">{preset.description}</div>
                {key === "admin" && (
                  <div className="text-xs text-slate-500 mt-2">
                    ✓ Full server administration ✓ User management ✓ All media permissions
                  </div>
                )}
                {key === "powerUser" && (
                  <div className="text-xs text-slate-500 mt-2">
                    ✓ Delete media ✓ Manage subtitles ✓ Convert media ✓ Public sharing
                  </div>
                )}
                {key === "user" && (
                  <div className="text-xs text-slate-500 mt-2">
                    ✓ Basic playback access ✓ No management permissions
                  </div>
                )}
              </button>
            )
          )}
        </div>
      </div>
      </div>
    </div>
  )
}