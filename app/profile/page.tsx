"use client"

import { useAuth } from "../providers"
import Navigation from "../components/Navigation"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

interface ProfileData {
  displayName?: string
  email?: string
  discordUsername?: string
  oidcProvider?: string
}

export default function ProfilePage() {
  const { admin } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: '',
    email: '',
    discordUsername: '',
    oidcProvider: undefined
  })

  useEffect(() => {
    if (admin) {
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/users/${admin?.id}`)
      if (res.ok) {
        const user = await res.json()
        if (user.oidcProvider) {
          setProfileData(prev => ({...prev, oidcProvider: user.oidcProvider}))
        }
      }
      const contactsRes = await fetch(`/api/users/${admin?.id}/contacts`)
      if (contactsRes.ok) {
        const data = await contactsRes.json()
        setProfileData(prev => ({...prev, ...data}))
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setError('Failed to load profile information')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/users/${admin?.id}/contacts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save profile')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      // Reload profile data to ensure the saved data is persisted
      await fetchProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white flex items-center justify-center">
        <div className="text-xl">Loading profile...</div>
      </div>
    )
  }

  if (!admin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4">
        <button
          onClick={() => router.back()}
          className="text-orange-400 hover:text-orange-300 mb-4 transition-colors"
        >
          ← Back
        </button>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 text-green-200 p-3 rounded-lg mb-4">
            ✓ Profile updated successfully
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-700">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">My Profile</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">View and manage your profile information</p>
          </div>

          <div className="px-4 sm:px-6 py-6 sm:py-8">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 mb-8 pb-8 border-b border-slate-700">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {(admin.displayName || admin.name).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-semibold text-white">{admin.displayName || admin.name}</h2>
                <div className="flex flex-col sm:flex-row gap-2 mt-2 items-center sm:items-start">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    admin.isAdmin 
                      ? 'bg-purple-900 text-purple-200' 
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    {admin.isAdmin ? "Administrator" : "Regular User"}
                  </span>
                  {profileData.oidcProvider && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-900 text-indigo-200" title={`Single Sign-On via ${profileData.oidcProvider}`}>
                      SSO ({profileData.oidcProvider})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200">Username (Jellyfin)</label>
                    <p className="mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm">
                      {admin.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">This cannot be changed</p>
                  </div>
                </div>
              </div>

              {/* Editable Profile Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-slate-200">Display Name</label>
                    <input
                      id="displayName"
                      type="text"
                      value={profileData.displayName || ''}
                      onChange={(e) => setProfileData({...profileData, displayName: e.target.value})}
                      className="mt-2 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter your display name"
                    />
                    <p className="mt-1 text-xs text-slate-400">A friendly name to display in the UI</p>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-200">Email Address</label>
                    <p className="mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm">
                      {profileData.email || 'Not set'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Used for SSO linking and email notifications (cannot be changed)</p>
                  </div>

                  <div>
                    <label htmlFor="discordUsername" className="block text-sm font-medium text-slate-200">Discord Username</label>
                    <input
                      id="discordUsername"
                      type="text"
                      value={profileData.discordUsername || ''}
                      onChange={(e) => setProfileData({...profileData, discordUsername: e.target.value})}
                      className="mt-2 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="username or username#1234"
                    />
                    <p className="mt-1 text-xs text-slate-400">Used for Discord notifications</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto border border-slate-600 text-slate-200 px-6 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
