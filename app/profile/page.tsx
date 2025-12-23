"use client"

import { useAuth } from "../providers"
import Navigation from "../components/Navigation"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"

interface ProfileData {
  displayName?: string
  email?: string
  discordUsername?: string
  oidcProvider?: string
  jellyfinUsername?: string
}

export default function ProfilePage() {
  const { admin } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: '',
    email: '',
    discordUsername: '',
    oidcProvider: undefined,
    jellyfinUsername: ''
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
      
      // Fetch user data from Jellyfin
      const res = await fetch(`/api/users/${admin?.id}`)
      if (res.ok) {
        const user = await res.json()
        setProfileData(prev => ({
          ...prev,
          jellyfinUsername: user.Name || admin?.name,
          oidcProvider: user.oidcProvider
        }))
      }
      
      // Fetch additional profile data from database
      const dbRes = await fetch(`/api/users/${admin?.id}/profile`)
      if (dbRes.ok) {
        const dbData = await dbRes.json()
        setProfileData(prev => ({
          ...prev,
          displayName: dbData.displayName || prev.jellyfinUsername,
          email: dbData.email,
          discordUsername: dbData.discordUsername
        }))
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setError('Failed to load profile information')
    } finally {
      setLoading(false)
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
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-700">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">My Profile</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">View your profile information</p>
          </div>

          <div className="px-4 sm:px-6 py-6 sm:py-8">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 mb-8 pb-8 border-b border-slate-700">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {(profileData.displayName || admin.name).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-semibold text-white">{profileData.displayName || admin.name}</h2>
                <p className="text-slate-400 text-sm mt-1">@{profileData.jellyfinUsername || admin.name}</p>
                <div className="flex flex-col sm:flex-row gap-2 mt-3 items-center sm:items-start">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    admin.isAdmin 
                      ? 'bg-purple-900 text-purple-200' 
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    {admin.isAdmin ? "Administrator" : "User"}
                  </span>
                  {profileData.oidcProvider && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-900 text-indigo-200" title={`Single Sign-On via ${profileData.oidcProvider}`}>
                      SSO Account
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information - Read Only */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Display Name</label>
                    <p className="text-white text-base">
                      {profileData.displayName || 'Not set'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Jellyfin Username</label>
                    <p className="text-white text-base">
                      {profileData.jellyfinUsername || admin.name}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                    <p className="text-white text-base">
                      {profileData.email || 'Not set'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Discord Username</label>
                    <p className="text-white text-base">
                      {profileData.discordUsername || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-700">
                <Link
                  href="/user-settings"
                  className="w-full sm:w-auto text-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Edit Profile
                </Link>
                {!profileData.oidcProvider && (
                  <Link
                    href="/change-password"
                    className="w-full sm:w-auto text-center border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Change Password
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto border border-slate-600 text-slate-200 px-6 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
