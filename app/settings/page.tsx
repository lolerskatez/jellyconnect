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
    webhookUrl: string
    botToken: string
    channelId: string
  }
  slack: {
    webhookUrl: string
    botToken: string
    channelId: string
  }
  telegram: {
    botToken: string
    chatId: string
  }
  webhook: {
    url: string
    secret: string
    headers: Record<string, string>
  }
}

export default function SettingsPage() {
  const { admin } = useAuth()
  const [activeTab, setActiveTab] = useState('notifications')
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
      webhookUrl: '',
      botToken: '',
      channelId: ''
    },
    slack: {
      webhookUrl: '',
      botToken: '',
      channelId: ''
    },
    telegram: {
      botToken: '',
      chatId: ''
    },
    webhook: {
      url: '',
      secret: '',
      headers: {}
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [testResults, setTestResults] = useState<{
    email?: boolean
    discord?: boolean
    slack?: boolean
    telegram?: boolean
    webhook?: boolean
  }>({})

  useEffect(() => {
    if (admin) {
      fetchSettings()
    }
  }, [admin])

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

  const testSlack = async () => {
    try {
      const response = await fetch('/api/services/test')
      if (response.ok) {
        const results = await response.json()
        setTestResults(prev => ({ ...prev, slack: results.slack?.testResult ?? false }))
      }
    } catch (err) {
      console.error('Failed to test Slack:', err)
      setTestResults(prev => ({ ...prev, slack: false }))
    }
  }

  const testTelegram = async () => {
    try {
      const response = await fetch('/api/services/test')
      if (response.ok) {
        const results = await response.json()
        setTestResults(prev => ({ ...prev, telegram: results.telegram?.testResult ?? false }))
      }
    } catch (err) {
      console.error('Failed to test Telegram:', err)
      setTestResults(prev => ({ ...prev, telegram: false }))
    }
  }

  const testWebhook = async () => {
    try {
      const response = await fetch('/api/services/test')
      if (response.ok) {
        const results = await response.json()
        setTestResults(prev => ({ ...prev, webhook: results.webhook?.testResult ?? false }))
      }
    } catch (err) {
      console.error('Failed to test Webhook:', err)
      setTestResults(prev => ({ ...prev, webhook: false }))
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

  const updateSlackSetting = (field: keyof Settings['slack'], value: string) => {
    setSettings(prev => ({
      ...prev,
      slack: {
        ...prev.slack,
        [field]: value
      }
    }))
  }

  const updateTelegramSetting = (field: keyof Settings['telegram'], value: string) => {
    setSettings(prev => ({
      ...prev,
      telegram: {
        ...prev.telegram,
        [field]: value
      }
    }))
  }

  const updateWebhookSetting = (field: keyof Settings['webhook'], value: string | Record<string, string>) => {
    setSettings(prev => ({
      ...prev,
      webhook: {
        ...prev.webhook,
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
                  Webhook URL (Recommended)
                </label>
                <input
                  type="url"
                  value={settings.discord.webhookUrl}
                  onChange={(e) => updateDiscordSetting('webhookUrl', e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Create a webhook in your Discord server settings for easy message sending
                </p>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-sm font-medium text-slate-200 mb-2">Alternative: Bot Token (Advanced)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Bot Token
                    </label>
                    <input
                      type="password"
                      value={settings.discord.botToken}
                      onChange={(e) => updateDiscordSetting('botToken', e.target.value)}
                      placeholder="Your bot token"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Channel ID
                    </label>
                    <input
                      type="text"
                      value={settings.discord.channelId}
                      onChange={(e) => updateDiscordSetting('channelId', e.target.value)}
                      placeholder="Channel ID for messages"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded-lg">
              <h3 className="text-sm font-medium text-purple-400 mb-1">Discord Setup Instructions:</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• <strong>Webhook (Easiest):</strong> Server Settings → Integrations → Webhooks → Create Webhook</li>
                <li>• <strong>Bot (Advanced):</strong> Create bot at https://discord.com/developers/applications</li>
                <li>• Copy the webhook URL or bot token and paste above</li>
                <li>• For bot setup, also provide the channel ID where messages should be sent</li>
              </ul>
            </div>
          </div>

          {/* Slack Settings */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Slack Configuration</h2>
              <button
                type="button"
                onClick={testSlack}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
              >
                Test Slack
              </button>
            </div>

            {testResults.slack !== undefined && (
              <div className={`p-3 rounded-lg mb-4 border ${testResults.slack ? 'bg-green-900 text-green-200 border-green-700' : 'bg-red-900 text-red-200 border-red-700'}`}>
                Slack test: {testResults.slack ? 'Success' : 'Failed'}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Webhook URL (Recommended)
                </label>
                <input
                  type="url"
                  value={settings.slack.webhookUrl}
                  onChange={(e) => updateSlackSetting('webhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Create an incoming webhook in your Slack workspace settings for easy message sending
                </p>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-sm font-medium text-slate-200 mb-2">Alternative: Bot Token (Advanced)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Bot Token
                    </label>
                    <input
                      type="password"
                      value={settings.slack.botToken}
                      onChange={(e) => updateSlackSetting('botToken', e.target.value)}
                      placeholder="xoxb-your-bot-token"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Channel ID
                    </label>
                    <input
                      type="text"
                      value={settings.slack.channelId}
                      onChange={(e) => updateSlackSetting('channelId', e.target.value)}
                      placeholder="C1234567890"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded-lg">
              <h3 className="text-sm font-medium text-purple-400 mb-1">Slack Setup Instructions:</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• <strong>Webhook (Easiest):</strong> Apps → Incoming Webhooks → Add to Slack</li>
                <li>• <strong>Bot (Advanced):</strong> Create bot at https://api.slack.com/apps</li>
                <li>• Copy the webhook URL or bot token and paste above</li>
                <li>• For bot setup, also provide the channel ID where messages should be sent</li>
              </ul>
            </div>
          </div>

          {/* Telegram Settings */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Telegram Configuration</h2>
              <button
                type="button"
                onClick={testTelegram}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
              >
                Test Telegram
              </button>
            </div>

            {testResults.telegram !== undefined && (
              <div className={`p-3 rounded-lg mb-4 border ${testResults.telegram ? 'bg-green-900 text-green-200 border-green-700' : 'bg-red-900 text-red-200 border-red-700'}`}>
                Telegram test: {testResults.telegram ? 'Success' : 'Failed'}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Bot Token
                </label>
                <input
                  type="password"
                  value={settings.telegram.botToken}
                  onChange={(e) => updateTelegramSetting('botToken', e.target.value)}
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Get this from @BotFather on Telegram
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Chat ID
                </label>
                <input
                  type="text"
                  value={settings.telegram.chatId}
                  onChange={(e) => updateTelegramSetting('chatId', e.target.value)}
                  placeholder="-1001234567890"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Channel or group ID where messages should be sent
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded-lg">
              <h3 className="text-sm font-medium text-cyan-400 mb-1">Telegram Setup Instructions:</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Message @BotFather on Telegram and create a new bot</li>
                <li>• Copy the bot token provided by BotFather</li>
                <li>• Add the bot to your channel/group and give it admin permissions</li>
                <li>• Get the chat ID by messaging the bot or checking bot logs</li>
                <li>• For channels, the chat ID is usually negative (e.g., -1001234567890)</li>
              </ul>
            </div>
          </div>

          {/* Webhook Settings */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Custom Webhook Configuration</h2>
              <button
                type="button"
                onClick={testWebhook}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
              >
                Test Webhook
              </button>
            </div>

            {testResults.webhook !== undefined && (
              <div className={`p-3 rounded-lg mb-4 border ${testResults.webhook ? 'bg-green-900 text-green-200 border-green-700' : 'bg-red-900 text-red-200 border-red-700'}`}>
                Webhook test: {testResults.webhook ? 'Success' : 'Failed'}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={settings.webhook.url}
                  onChange={(e) => updateWebhookSetting('url', e.target.value)}
                  placeholder="https://your-app.com/webhook"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  URL that will receive POST requests with notification data
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Secret Key (Optional)
                </label>
                <input
                  type="password"
                  value={settings.webhook.secret}
                  onChange={(e) => updateWebhookSetting('secret', e.target.value)}
                  placeholder="your-webhook-secret"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Secret key for webhook signature verification
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Custom Headers (JSON)
                </label>
                <textarea
                  value={JSON.stringify(settings.webhook.headers, null, 2)}
                  onChange={(e) => {
                    try {
                      const headers = JSON.parse(e.target.value)
                      updateWebhookSetting('headers', headers)
                    } catch (err) {
                      // Invalid JSON, keep current value
                    }
                  }}
                  placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Additional headers to include with webhook requests (JSON format)
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded-lg">
              <h3 className="text-sm font-medium text-orange-400 mb-1">Webhook Payload Format:</h3>
              <div className="text-sm text-slate-300 font-mono bg-slate-950 border border-slate-700 p-2 rounded mt-1">
                {`{
  "userId": "user123",
  "subject": "Notification Subject",
  "message": "Notification message",
  "type": "expiry_warning",
  "timestamp": "2025-12-19T10:00:00Z"
}`}
              </div>
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