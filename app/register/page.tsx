"use client"

import { useState } from "react"
import React from "react"
import { useRouter } from "next/navigation"

interface InviteValidation {
  valid: boolean
  profile: string
  inviteId: string
  email?: string
}

// Validation functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const isValidDiscordId = (discordId: string): boolean => {
  // Discord usernames can be: username#1234 or just username
  const discordRegex = /^.{2,32}#\d{4}$|^.{2,32}$/
  return discordRegex.test(discordId)
}

export default function RegisterPage() {
  const router = useRouter()
  // Determine app mode based on port: 3001 = public, 3000 = admin
  const appMode = typeof window !== 'undefined' && window.location.port === '3001' ? 'public' : 'admin'
  console.log('[RegisterPage] Rendering with appMode:', appMode)
  const [step, setStep] = useState<'invite' | 'register'>('invite')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteValidation, setInviteValidation] = useState<InviteValidation | null>(null)
  const [enableRegistration, setEnableRegistration] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    discordId: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if registration is enabled on component mount
  React.useEffect(() => {
    const checkRegistrationSetting = async () => {
      try {
        const res = await fetch('/api/config/registration')
        if (res.ok) {
          const data = await res.json()
          setEnableRegistration(data.enableRegistration ?? true)
        }
      } catch (error) {
        console.error('Failed to fetch registration setting:', error)
        // Default to enabled on error
        setEnableRegistration(true)
      }
    }
    
    checkRegistrationSetting()
  }, [])

  const validateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // If registration is disabled and there's no invite code, show error
    if (!enableRegistration && !inviteCode.trim()) {
      setError('Registration is currently disabled. Please use an invitation link.')
      setLoading(false)
      return
    }

    // If no invite code provided when registration is disabled
    if (!enableRegistration && !inviteCode.trim()) {
      setError('You must provide an invite code to register')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/invites/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.toUpperCase() })
      })

      const data = await res.json()

      if (res.ok && data.valid) {
        setInviteValidation(data)
        // Pre-fill email from invite if available
        if (data.email) {
          setFormData(prev => ({ ...prev, email: data.email }))
        }
        setStep('register')
      } else {
        setError(data.error || 'Invalid invite code')
      }
    } catch (err) {
      setError('Failed to validate invite code')
    } finally {
      setLoading(false)
    }
  }

  const registerUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    // Email is now required
    if (!formData.email) {
      setError('Email is required')
      setLoading(false)
      return
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    // Validate Discord ID format if provided
    if (formData.discordId && !isValidDiscordId(formData.discordId)) {
      setError('Please enter a valid Discord username (e.g., username#1234 or just username)')
      setLoading(false)
      return
    }

    try {
      // First validate the invite again with user creation intent
      const validateRes = await fetch('/api/invites/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.toUpperCase(), userId: 'temp' })
      })

      if (!validateRes.ok) {
        const errorData = await validateRes.json()
        setError(errorData.error || 'Invite validation failed')
        setLoading(false)
        return
      }

      const validationData = await validateRes.json()

      // Create the user
      const createRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          discordId: formData.discordId || undefined,
          inviteId: inviteValidation?.inviteId
        })
      })

      if (createRes.ok) {
        const userData = await createRes.json()

        // Set the user profile based on invite
        const profileRes = await fetch(`/api/users/${userData.Id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getProfilePolicy(validationData.profile))
        })

        if (profileRes.ok) {
          // Record the invite usage with the actual user ID
          await fetch('/api/invites/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inviteCode.toUpperCase(), userId: userData.Id })
          })

          // Redirect to login
          router.push('/login?message=Registration successful! Please log in.')
        } else {
          setError('Failed to set user permissions')
        }
      } else {
        const errorData = await createRes.json()
        setError(errorData.error || 'Failed to create user')
      }
    } catch (err) {
      setError('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const getProfilePolicy = (profile: string) => {
    const policies = {
      user: {
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
      powerUser: {
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
      admin: {
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
      }
    }
    return policies[profile as keyof typeof policies] || policies.user
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
            {step === 'invite' ? 'Enter Invite Code' : 'Create Your Account'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            {step === 'invite'
              ? 'You need a valid invite code to register'
              : `Creating account with ${inviteValidation?.profile} permissions`
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {step === 'invite' ? (
          <form onSubmit={validateInvite} className="mt-8 space-y-6">
            {!enableRegistration && (
              <div className="bg-blue-900 border border-blue-700 text-blue-200 p-4 rounded-lg text-sm">
                <p className="font-medium mb-1">Registration is Currently Disabled</p>
                <p>You can only register using an invitation link. If you have an invite code, enter it below.</p>
              </div>
            )}
            <div>
              <label htmlFor="inviteCode" className="sr-only">
                Invite Code
              </label>
              <input
                id="inviteCode"
                name="inviteCode"
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-600 placeholder-slate-500 text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                placeholder="Enter your invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={12}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-slate-800 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
              >
                {loading ? 'Validating...' : 'Continue'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={registerUser} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-4 py-3 border border-slate-600 placeholder-slate-500 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 appearance-none relative block w-full px-4 py-3 border border-slate-600 placeholder-slate-500 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="discordId" className="block text-sm font-medium text-slate-300">
                  Discord Username (Optional)
                </label>
                <input
                  id="discordId"
                  name="discordId"
                  type="text"
                  className="mt-1 appearance-none relative block w-full px-4 py-3 border border-slate-600 placeholder-slate-500 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                  placeholder="username#1234 or username"
                  value={formData.discordId}
                  onChange={(e) => setFormData({...formData, discordId: e.target.value})}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Your Discord username (with or without discriminator)
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 appearance-none relative block w-full px-4 py-3 border border-slate-600 placeholder-slate-500 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="mt-1 appearance-none relative block w-full px-4 py-3 border border-slate-600 placeholder-slate-500 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('invite')}
                className="flex-1 py-2 px-4 border border-slate-600 rounded-lg shadow-sm text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-slate-800 transition-colors duration-200"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-slate-800 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors duration-200"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  )
}