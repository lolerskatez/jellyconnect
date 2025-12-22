"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"
import AuthSettingsComponent from "../../components/AuthSettingsComponent"

interface Settings {
  jellyfinUrl: string
  smtp: {
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
    from: string
  }
  discord: {
    botToken: string
  }
}

export default function SettingsPage() {
  const { admin } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<Settings>({
    jellyfinUrl: '',
    smtp: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      from: ''
    },
    discord: {
      botToken: ''
    }
  })
  const [enableRegistration, setEnableRegistration] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [testResults, setTestResults] = useState<{
    email?: boolean
    discord?: boolean
  }>({})

  useEffect(() => {
    if (admin) {
      fetchSettings()
      fetchRegistrationSetting()
    }
  }, [admin])

  const fetchRegistrationSetting = async () => {
    try {
      const response = await fetch('/api/config/registration')
      if (response.ok) {
        const data = await response.json()
        setEnableRegistration(data.enableRegistration ?? true)
      }
    } catch (err) {
      console.error('Failed to fetch registration setting:', err)
    }
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Only save registration setting
      const regResponse = await fetch('/api/config/registration', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'authorization': 'admin' // Simple auth check
        },
        body: JSON.stringify({ enableRegistration })
      })

      if (!regResponse.ok) {
        throw new Error('Failed to save registration setting')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const testEmail = async () => {
    try {
      const response = await fetch('/api/services/test')
      if (response.ok) {
        const results = await response.json()
        setTestResults(prev => ({ ...prev, email: results.email?.testResult ?? false }))
      }
    } catch (err) {
      console.error('Failed to test email:', err)
      setTestResults(prev => ({ ...prev, email: false }))
    }
  }

  const testDiscord = async () => {
    try {
      const response = await fetch('/api/services/test')
      if (response.ok) {
        const results = await response.json()
        setTestResults(prev => ({ ...prev, discord: results.discord?.testResult ?? false }))
      }
    } catch (err) {
      console.error('Failed to test Discord:', err)
      setTestResults(prev => ({ ...prev, discord: false }))
    }
  }

  const updateSmtpSetting = (field: keyof Settings['smtp'], value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      smtp: {
        ...prev.smtp,
        [field]: value
      }
    }))
  }

  const updateDiscordSetting = (field: keyof Settings['discord'], value: string) => {
    setSettings(prev => ({
      ...prev,
      discord: {
        ...prev.discord,
        [field]: value
      }
    }))
  }

  const updateJellyfinUrl = (value: string) => {
    setSettings(prev => ({
      ...prev,
      jellyfinUrl: value
    }))
  }

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
          <div className="text-center text-white">Loading settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent mb-2">System Settings</h1>
          <p className="text-slate-400">Configure notifications, authentication, and other system features</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('auth')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'auth'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Authentication
          </button>
        </div>

        {activeTab === 'general' && (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-900 text-red-200 p-4 rounded-lg border border-red-700 mb-6">{error}</div>
            )}

            {success && (
              <div className="bg-green-900 text-green-200 p-4 rounded-lg border border-green-700 mb-6">
                Settings saved successfully
              </div>
            )}

            <form onSubmit={saveGeneralSettings} className="space-y-6">
              {/* Registration Settings */}
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Registration Settings</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <label className="font-medium text-white block">Enable User Registration</label>
                      <p className="text-sm text-slate-400 mt-1">
                        Allow users to register on the public login page. When disabled, only invitation links will work.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableRegistration}
                      onChange={(e) => setEnableRegistration(e.target.checked)}
                      className="w-5 h-5 rounded accent-orange-500 bg-slate-600 border-slate-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none w-full"
              >
                {saving ? 'Saving...' : 'Save General Settings'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'auth' && (
          <AuthSettingsComponent />
        )}

        {activeTab === 'notifications' && (
          <>
            {error && (
              <div className="bg-red-900 text-red-200 p-4 rounded-lg border border-red-700 mb-6">{error}</div>
            )}

            {success && (
              <div className="bg-green-900 text-green-200 p-4 rounded-lg border border-green-700 mb-6">
                Settings saved successfully
              </div>
            )}

            <form onSubmit={saveSettings} className="space-y-6">
              {/* Jellyfin Server Settings */}
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Jellyfin Server Configuration</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Jellyfin Server URL
                    </label>
                    <input
                      type="url"
                      value={settings.jellyfinUrl}
                      onChange={(e) => updateJellyfinUrl(e.target.value)}
                      placeholder="http://localhost:8096"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      The URL of your Jellyfin server. Used for user creation and invite flows.
                    </p>
                  </div>
                </div>
              </div>

              {/* SMTP Settings */}
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Email Configuration (SMTP)</h2>
                  <button
                    type="button"
                    onClick={testEmail}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
                  >
                    Test Email
                  </button>
                </div>

                {testResults.email !== undefined && (
                  <div className={`p-3 rounded-lg mb-4 border ${testResults.email ? 'bg-green-900 text-green-200 border-green-700' : 'bg-red-900 text-red-200 border-red-700'}`}>
                    Email test: {testResults.email ? 'Success' : 'Failed'}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={settings.smtp.host}
                      onChange={(e) => updateSmtpSetting('host', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={settings.smtp.port}
                      onChange={(e) => updateSmtpSetting('port', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={settings.smtp.user}
                      onChange={(e) => updateSmtpSetting('user', e.target.value)}
                      placeholder="your-email@gmail.com"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={settings.smtp.pass}
                      onChange={(e) => updateSmtpSetting('pass', e.target.value)}
                      placeholder="your-app-password"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      From Email
                    </label>
                    <input
                      type="email"
                      value={settings.smtp.from}
                      onChange={(e) => updateSmtpSetting('from', e.target.value)}
                      placeholder="noreply@jellyconnect.com"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={settings.smtp.secure}
                      onChange={(e) => updateSmtpSetting('secure', e.target.checked)}
                      className="h-4 w-4 accent-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-orange-500"
                    />
                    <label htmlFor="smtpSecure" className="ml-2 block text-sm text-slate-200">
                      Use SSL/TLS (usually for port 465)
                    </label>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded-lg">
                  <h3 className="text-sm font-medium text-orange-400 mb-1">Gmail Setup Instructions:</h3>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Use &quot;smtp.gmail.com&quot; as host and port 587</li>
                    <li>• Enable 2-factor authentication on your Google account</li>
                    <li>• Generate an &quot;App Password&quot; in Google Account settings</li>
                    <li>• Use your Gmail address as username and the app password</li>
                  </ul>
                </div>
              </div>

              {/* Discord Settings */}
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Discord Configuration</h2>
                  <button
                    type="button"
                    onClick={testDiscord}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
                  >
                    Test Discord
                  </button>
                </div>

                {testResults.discord !== undefined && (
                  <div className={`p-3 rounded-lg mb-4 border ${testResults.discord ? 'bg-green-900 text-green-200 border-green-700' : 'bg-red-900 text-red-200 border-red-700'}`}>
                    Discord test: {testResults.discord ? 'Success' : 'Failed'}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Bot Token
                    </label>
                    <input
                      type="password"
                      value={settings.discord.botToken}
                      onChange={(e) => updateDiscordSetting('botToken', e.target.value)}
                      placeholder="Your Discord bot token"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Bot token is used to send direct messages to users based on their Discord username
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-400 mb-1">Discord Bot Setup Instructions:</h3>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Create a bot at https://discord.com/developers/applications</li>
                    <li>• Enable &quot;Message Content Intent&quot; in Bot settings</li>
                    <li>• Copy the bot token and paste above</li>
                    <li>• Users will be able to enter their Discord username in their profile</li>
                    <li>• Bot will send direct messages to users based on their username</li>
                  </ul>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-md transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:bg-slate-700 disabled:hover:scale-100 shadow-lg"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}