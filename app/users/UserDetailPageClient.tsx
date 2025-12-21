"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"

interface UserPolicy {
  IsAdministrator: boolean
  IsHidden: boolean
  IsDisabled: boolean
  EnableContentDeletion: boolean
  EnableAllFolders: boolean
}

const ROLE_PRESETS = {
  admin: {
    label: "Administrator",
    description: "Full access to all features",
    policy: {
      IsAdministrator: true,
      IsHidden: false,
      IsDisabled: false,
      EnableContentDeletion: true,
      EnableAllFolders: true,
    },
  },
  powerUser: {
    label: "Power User",
    description: "Can delete media and access all libraries",
    policy: {
      IsAdministrator: false,
      IsHidden: false,
      IsDisabled: false,
      EnableContentDeletion: true,
      EnableAllFolders: true,
    },
  },
  user: {
    label: "User",
    description: "Can only view media (read-only)",
    policy: {
      IsAdministrator: false,
      IsHidden: false,
      IsDisabled: false,
      EnableContentDeletion: false,
      EnableAllFolders: true,
    },
  },
}

export default function UserDetailPageClient() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/users/${userId}`)
      if (!res.ok) throw new Error("Failed to fetch user")
      const data = await res.json()
      setUser(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch user")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const getUserRole = (): keyof typeof ROLE_PRESETS => {
    if (!user?.Policy) return "user"
    if (user.Policy.IsAdministrator) return "admin"
    if (user.Policy.EnableContentDeletion && user.Policy.EnableAllFolders)
      return "powerUser"
    return "user"
  }

  const applyRolePreset = async (role: keyof typeof ROLE_PRESETS) => {
    if (!user) return
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

  if (loading) return <div className="p-4">Loading user...</div>
  if (!user) return <div className="p-4 text-red-600">User not found</div>

  const currentRole = getUserRole()

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="text-blue-500 hover:underline mb-4"
      >
         Back
      </button>

      <h1 className="text-3xl font-bold mb-6">{user.Name}</h1>

      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-100 text-green-800 p-3 rounded mb-4">
          User updated successfully
        </div>
      )}

      <div className="bg-white p-6 rounded border border-gray-200 mb-6">
        <h2 className="text-xl font-bold mb-4">User Status</h2>
        <div className="mb-4">
          <p className="text-gray-600 mb-2">Current Status:</p>
          {user.Policy?.IsDisabled ? (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded">
              Disabled
            </span>
          ) : (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded">
              Active
            </span>
          )}
        </div>
        <button
          onClick={toggleDisabled}
          disabled={saving}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
        >
          {user.Policy?.IsDisabled ? "Enable User" : "Disable User"}
        </button>
      </div>

      <div className="bg-white p-6 rounded border border-gray-200">
        <h2 className="text-xl font-bold mb-4">User Role</h2>
        <p className="text-gray-600 mb-4">
          Current role: <strong>{ROLE_PRESETS[currentRole].label}</strong>
        </p>

        <div className="space-y-3">
          {(Object.entries(ROLE_PRESETS) as Array<[keyof typeof ROLE_PRESETS, any]>).map(
            ([key, preset]) => (
              <button
                key={key}
                onClick={() => applyRolePreset(key)}
                disabled={saving || currentRole === key}
                className={`w-full p-4 border-2 rounded text-left transition ${
                  currentRole === key
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                } disabled:opacity-50`}
              >
                <div className="font-bold">{preset.label}</div>
                <div className="text-sm text-gray-600">{preset.description}</div>
                {key === "admin" && (
                  <div className="text-xs text-gray-500 mt-2">
                     Administrator privileges
                  </div>
                )}
                {key === "powerUser" && (
                  <div className="text-xs text-gray-500 mt-2">
                     Can delete media  Access all libraries
                  </div>
                )}
                {key === "user" && (
                  <div className="text-xs text-gray-500 mt-2">
                     View-only access
                  </div>
                )}
              </button>
            )
          )}
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p>User ID: {user.Id}</p>
      </div>
    </div>
  )
}
