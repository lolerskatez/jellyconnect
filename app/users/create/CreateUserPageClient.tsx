"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../providers"
import Navigation from "../../components/Navigation"

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

export default function CreateUserPageClient() {
  const router = useRouter()
  const { admin } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [discordId, setDiscordId] = useState("")
  const [slackId, setSlackId] = useState("")
  const [telegramId, setTelegramId] = useState("")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [role, setRole] = useState<"user" | "powerUser" | "admin">("user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      // Create user
      const createRes = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: username, 
          password,
          displayName: displayName || undefined,
          email, 
          discordId,
          slackId,
          telegramId,
          webhookUrl
        }),
      })

      if (!createRes.ok) {
        const errorData = await createRes.json()
        throw new Error(errorData.error || "Failed to create user")
      }

      const user = await createRes.json()

      // Set user role/policy
      const preset = ROLE_PRESETS[role]
      const policyRes = await fetch(`/api/users/${user.Id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preset.policy),
      })

      if (!policyRes.ok) {
        throw new Error("Failed to set user role")
      }

      // Set expiry date if provided
      if (expiresAt) {
        const expiryRes = await fetch(`/api/users/${user.Id}/expiry`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expiresAt }),
        })

        if (!expiryRes.ok) {
          console.warn("Failed to set expiry date, but user was created successfully")
        }
      }

      router.push("/users")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

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

      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Create New User</h1>

      {error && (
        <div className="bg-red-900 text-red-200 border border-red-700 p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-200">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter username"
            required
            autoComplete="username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-200">Display Name (Optional)</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter display name"
            autoComplete="name"
          />
          <p className="text-xs text-slate-400 mt-1">
            Friendly name for display in the UI (defaults to username if not set)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-200">Email (Optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter email address"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-200">Discord Username (Optional)</label>
          <input
            type="text"
            value={discordId}
            onChange={(e) => setDiscordId(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="username#1234 or username"
            autoComplete="off"
          />
          <p className="text-xs text-slate-400 mt-1">
            Discord username with or without discriminator
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-200">Slack User ID (Optional)</label>
          <input
            type="text"
            value={slackId}
            onChange={(e) => setSlackId(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="U1234567890"
            autoComplete="off"
          />
          <p className="text-xs text-slate-400 mt-1">
            Slack user ID (starts with U followed by numbers)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-200">Telegram Username (Optional)</label>
          <input
            type="text"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="@username or username"
            autoComplete="off"
          />
          <p className="text-xs text-slate-400 mt-1">
            Telegram username with or without @
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-200">Webhook URL (Optional)</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="https://example.com/webhook"
            autoComplete="off"
          />
          <p className="text-xs text-slate-400 mt-1">
            HTTP/HTTPS webhook URL for custom notifications
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-200">Account Expiry (Optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            min={new Date().toISOString().split('T')[0]}
          />
          <p className="text-xs text-slate-400 mt-1">
            Leave empty for no expiry. User will receive warnings before expiry.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-200">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter password"
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-3 text-slate-200">User Role</label>
          <div className="space-y-2">
            {(Object.entries(ROLE_PRESETS) as Array<[string, typeof ROLE_PRESETS["user"]]>).map(([key, preset]) => (
              <label key={key} className="flex items-start p-3 bg-slate-800 border border-slate-700 rounded cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value={key}
                  checked={role === key}
                  onChange={(e) => setRole(e.target.value as "user" | "powerUser" | "admin")}
                  className="mt-1 mr-3 accent-orange-500"
                />
                <div>
                  <div className="font-medium text-white">{preset.label}</div>
                  <div className="text-sm text-slate-400">{preset.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create User"}
        </button>
      </form>
      </div>
    </div>
  )
}