"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const [config, setConfig] = useState({
    appUrl: '',
    jellyfinUrl: '',
    adminUsername: '',
    adminPassword: '',
    // SMTP
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    // Discord
    discordBotToken: '',
    // OIDC
    oidcEnabled: false,
    oidcProviderName: '',
    oidcDiscoveryUrl: '',
    oidcClientId: '',
    oidcClientSecret: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [setupAlreadyComplete, setSetupAlreadyComplete] = useState(false)
  const router = useRouter()

  // Check if setup has already been completed
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const res = await fetch('/api/setup')
        const data = await res.json()
        if (!data.setupNeeded && data.setupComplete) {
          setSetupAlreadyComplete(true)
          setError('Setup has already been completed. You cannot run setup again.')
        }
      } catch (err) {
        // If we can't check, allow setup to proceed
        console.warn('Could not check setup status:', err)
      }
    }
    checkSetupStatus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent submission if setup is already complete
    if (setupAlreadyComplete) {
      setError('Setup has already been completed. You cannot run setup again.')
      return
    }
    
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (res.ok) {
        // Add timestamp to force cache bypass
        router.push('/login?setup=complete')
      } else {
        setError(data.error || 'Failed to save configuration')
        console.error('Setup error:', data)
      }
    } catch (error) {
      setError('Error saving configuration: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setConfig({ 
      ...config, 
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value 
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-8 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
        <div>
          <h2 className="mt-2 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
            Setup JellyConnect
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Configure your Jellyfin server and optional services. You can skip optional fields and configure them later.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Jellyfin Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-200 border-b border-slate-600 pb-2">Application Configuration</h3>
            <div>
              <label htmlFor="appUrl" className="block text-sm font-medium text-slate-300">
                Application URL
              </label>
              <input
                id="appUrl"
                name="appUrl"
                type="url"
                required
                autoComplete="url"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://your-domain.com"
                value={config.appUrl}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-slate-400">
                The full URL where JellyConnect is accessible (used for SSO redirects and cookies)
              </p>
            </div>
            <h3 className="text-lg font-medium text-slate-200 border-b border-slate-600 pb-2">Jellyfin Server</h3>
            <div>
              <label htmlFor="jellyfinUrl" className="block text-sm font-medium text-slate-300">
                Jellyfin Server URL
              </label>
              <input
                id="jellyfinUrl"
                name="jellyfinUrl"
                type="url"
                required
                autoComplete="url"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="http://localhost:8096"
                value={config.jellyfinUrl}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="adminUsername" className="block text-sm font-medium text-slate-300">
                Jellyfin Admin Username
              </label>
              <input
                id="adminUsername"
                name="adminUsername"
                type="text"
                required
                autoComplete="username"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="admin"
                value={config.adminUsername}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-slate-300">
                Jellyfin Admin Password
              </label>
              <input
                id="adminPassword"
                name="adminPassword"
                type="password"
                required
                autoComplete="off"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Your Jellyfin Admin Password"
                value={config.adminPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* SMTP Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-200 border-b border-slate-600 pb-2">Email Notifications (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="smtpHost" className="block text-sm font-medium text-slate-300">
                  SMTP Host
                </label>
                <input
                  id="smtpHost"
                  name="smtpHost"
                  type="text"
                  autoComplete="off"
                  className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="smtp.gmail.com"
                  value={config.smtpHost}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="smtpPort" className="block text-sm font-medium text-slate-300">
                  SMTP Port
                </label>
                <input
                  id="smtpPort"
                  name="smtpPort"
                  type="number"
                  autoComplete="off"
                  className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="587"
                  value={config.smtpPort}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                id="smtpSecure"
                name="smtpSecure"
                type="checkbox"
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-600 rounded bg-slate-700"
                checked={config.smtpSecure}
                onChange={handleChange}
              />
              <label htmlFor="smtpSecure" className="ml-2 block text-sm text-slate-300">
                Use SSL/TLS
              </label>
            </div>
            <div>
              <label htmlFor="smtpUser" className="block text-sm font-medium text-slate-300">
                SMTP Username
              </label>
              <input
                id="smtpUser"
                name="smtpUser"
                type="email"
                autoComplete="off"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="your-email@gmail.com"
                value={config.smtpUser}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="smtpPass" className="block text-sm font-medium text-slate-300">
                SMTP Password
              </label>
              <input
                id="smtpPass"
                name="smtpPass"
                type="password"
                autoComplete="off"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Your SMTP password or app password"
                value={config.smtpPass}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="smtpFrom" className="block text-sm font-medium text-slate-300">
                From Email Address
              </label>
              <input
                id="smtpFrom"
                name="smtpFrom"
                type="email"
                autoComplete="off"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="noreply@yourdomain.com"
                value={config.smtpFrom}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Discord Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-200 border-b border-slate-600 pb-2">Discord Notifications (Optional)</h3>
            <div>
              <label htmlFor="discordBotToken" className="block text-sm font-medium text-slate-300">
                Discord Bot Token
              </label>
              <input
                id="discordBotToken"
                name="discordBotToken"
                type="password"
                autoComplete="off"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Your Discord bot token"
                value={config.discordBotToken}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-slate-400">
                Create a bot at <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">Discord Developer Portal</a>
              </p>
            </div>
          </div>

          {/* OIDC Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-200 border-b border-slate-600 pb-2">SSO/OIDC Authentication (Optional)</h3>
            <div className="flex items-center">
              <input
                id="oidcEnabled"
                name="oidcEnabled"
                type="checkbox"
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-600 rounded bg-slate-700"
                checked={config.oidcEnabled}
                onChange={handleChange}
              />
              <label htmlFor="oidcEnabled" className="ml-2 block text-sm text-slate-300">
                Enable OIDC SSO
              </label>
            </div>
            {config.oidcEnabled && (
              <>
                <div>
                  <label htmlFor="oidcProviderName" className="block text-sm font-medium text-slate-300">
                    Provider Name
                  </label>
                  <input
                    id="oidcProviderName"
                    name="oidcProviderName"
                    type="text"
                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Authentik"
                    value={config.oidcProviderName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="oidcDiscoveryUrl" className="block text-sm font-medium text-slate-300">
                    Discovery URL
                  </label>
                  <input
                    id="oidcDiscoveryUrl"
                    name="oidcDiscoveryUrl"
                    type="url"
                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="https://auth.yourdomain.com/.well-known/openid-configuration"
                    value={config.oidcDiscoveryUrl}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="oidcClientId" className="block text-sm font-medium text-slate-300">
                    Client ID
                  </label>
                  <input
                    id="oidcClientId"
                    name="oidcClientId"
                    type="text"
                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Your OIDC client ID"
                    value={config.oidcClientId}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="oidcClientSecret" className="block text-sm font-medium text-slate-300">
                    Client Secret
                  </label>
                  <input
                    id="oidcClientSecret"
                    name="oidcClientSecret"
                    type="password"
                    autoComplete="off"
                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Your OIDC client secret"
                    value={config.oidcClientSecret}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </div>
          {error && (
            <div className="rounded-md bg-red-900 border border-red-700 p-4">
              <p className="text-sm font-medium text-red-200">{error}</p>
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}