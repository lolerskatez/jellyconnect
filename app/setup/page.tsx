"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState({
    appUrl: '',
    jellyfinUrl: '',
    adminUsername: '',
    adminPassword: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    discordBotToken: '',
    oidcEnabled: false,
    oidcProviderName: '',
    oidcDiscoveryUrl: '',
    oidcClientId: '',
    oidcClientSecret: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [setupAlreadyComplete, setSetupAlreadyComplete] = useState(false)
  const [testingStates, setTestingStates] = useState({
    jellyfin: false,
    smtp: false,
    oidc: false,
  })
  const [testResults, setTestResults] = useState({
    jellyfin: null as boolean | null,
    smtp: null as boolean | null,
    oidc: null as boolean | null,
  })
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
        console.warn('Could not check setup status:', err)
      }
    }
    checkSetupStatus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
        setSuccess(true)
        setTimeout(() => {
          router.push('/login?setup=complete')
        }, 2000)
      } else {
        const errorMessage = data.error || data.details || 'Failed to save configuration'
        setError(errorMessage)
        console.error('Setup error:', data)
      }
    } catch (error) {
      setError('Error saving configuration: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const isStep1Valid = config.appUrl && config.jellyfinUrl && config.adminUsername && config.adminPassword
  const isStep2Valid = !config.smtpHost || (config.smtpHost && config.smtpUser && config.smtpPass)
  const isStep3Valid = true // Discord is optional
  const isStep4Valid = !config.oidcEnabled || (config.oidcEnabled && config.oidcDiscoveryUrl && config.oidcClientId && config.oidcClientSecret)

  const canProceed = () => {
    if (step === 1) return isStep1Valid
    if (step === 2) return isStep2Valid
    if (step === 3) return isStep3Valid
    if (step === 4) return isStep4Valid
    return false
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setConfig({ 
      ...config, 
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value 
    })
  }

  const testJellyfinConnection = async () => {
    setTestingStates(prev => ({ ...prev, jellyfin: true }))
    try {
      const res = await fetch('/api/debug/jellyfin-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jellyfinUrl: config.jellyfinUrl,
          adminUsername: config.adminUsername,
          adminPassword: config.adminPassword,
        }),
      })
      const data = await res.json()
      setTestResults(prev => ({ ...prev, jellyfin: res.ok }))
      if (!res.ok) {
        setError(`Jellyfin test failed: ${data.error || data.details || 'Unknown error'}`)
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, jellyfin: false }))
      setError(`Jellyfin connection test error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setTestingStates(prev => ({ ...prev, jellyfin: false }))
    }
  }

  const testSMTPConnection = async () => {
    if (!config.smtpHost || !config.smtpUser) {
      setError('SMTP host and username are required for testing')
      return
    }
    setTestingStates(prev => ({ ...prev, smtp: true }))
    try {
      const res = await fetch('/api/services/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'email',
          config: {
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure,
            user: config.smtpUser,
            pass: config.smtpPass,
            from: config.smtpFrom || config.smtpUser,
          },
        }),
      })
      const data = await res.json()
      setTestResults(prev => ({ ...prev, smtp: res.ok }))
      if (!res.ok) {
        setError(`SMTP test failed: ${data.error || data.message || 'Unknown error'}`)
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, smtp: false }))
      setError(`SMTP connection test error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setTestingStates(prev => ({ ...prev, smtp: false }))
    }
  }

  const testOIDCDiscovery = async () => {
    if (!config.oidcDiscoveryUrl) {
      setError('OIDC Discovery URL is required for testing')
      return
    }
    setTestingStates(prev => ({ ...prev, oidc: true }))
    try {
      const res = await fetch(config.oidcDiscoveryUrl)
      const data = await res.json()
      setTestResults(prev => ({ ...prev, oidc: res.ok && data.issuer }))
      if (!res.ok || !data.issuer) {
        setError('OIDC discovery failed: Invalid or unreachable discovery URL')
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, oidc: false }))
      setError(`OIDC discovery test error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setTestingStates(prev => ({ ...prev, oidc: false }))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="max-w-2xl w-full space-y-8 p-6 sm:p-8 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
        <div>
          <h2 className="mt-2 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
            Setup JellyConnect
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Step {step} of 4 • {step === 1 ? 'Jellyfin Configuration' : step === 2 ? 'Email Notifications' : step === 3 ? 'Discord Notifications' : 'SSO/OIDC'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-900 border border-red-700 p-4">
            <p className="text-sm font-medium text-red-200">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="rounded-md bg-green-900 border border-green-700 p-4">
            <p className="text-sm font-medium text-green-200">✓ Setup completed successfully! Redirecting...</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* STEP 1: Jellyfin Configuration */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200 border-b border-slate-600 pb-2">Application & Jellyfin Configuration</h3>
              
              <div>
                <label htmlFor="appUrl" className="block text-sm font-medium text-slate-300">
                  Application URL <span className="text-red-400">*</span>
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
                  The full URL where JellyConnect is accessible (used for SSO redirects)
                </p>
              </div>

              <div>
                <label htmlFor="jellyfinUrl" className="block text-sm font-medium text-slate-300">
                  Jellyfin Server URL <span className="text-red-400">*</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adminUsername" className="block text-sm font-medium text-slate-300">
                    Admin Username <span className="text-red-400">*</span>
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
                    Admin Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="adminPassword"
                    name="adminPassword"
                    type="password"
                    required
                    autoComplete="off"
                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Your admin password"
                    value={config.adminPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={testJellyfinConnection}
                  disabled={testingStates.jellyfin || !config.jellyfinUrl || !config.adminUsername || !config.adminPassword}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-600 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testingStates.jellyfin ? (
                    <>
                      <span className="animate-spin">⊙</span> Testing...
                    </>
                  ) : testResults.jellyfin === true ? (
                    <>✓ Connection successful</>
                  ) : testResults.jellyfin === false ? (
                    <>✗ Connection failed</>
                  ) : (
                    <>Test Jellyfin Connection</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Email Configuration */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200 border-b border-slate-600 pb-2">Email Notifications (Optional)</h3>
              <p className="text-sm text-slate-400">Leave empty to skip email configuration</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Use SSL/TLS (port 465 typically)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="smtpUser" className="block text-sm font-medium text-slate-300">
                    SMTP Username / Email
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
                    placeholder="App password or password"
                    value={config.smtpPass}
                    onChange={handleChange}
                  />
                </div>
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

              {config.smtpHost && config.smtpUser && config.smtpPass && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={testSMTPConnection}
                    disabled={testingStates.smtp}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-600 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {testingStates.smtp ? (
                      <>
                        <span className="animate-spin">⊙</span> Testing...
                      </>
                    ) : testResults.smtp === true ? (
                      <>✓ SMTP working</>
                    ) : testResults.smtp === false ? (
                      <>✗ SMTP failed</>
                    ) : (
                      <>Test SMTP Connection</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Discord Configuration */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200 border-b border-slate-600 pb-2">Discord Notifications (Optional)</h3>
              <p className="text-sm text-slate-400">Leave empty to skip Discord configuration</p>

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
                <p className="mt-2 text-xs text-slate-400">
                  Create a bot at{' '}
                  <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
                    Discord Developer Portal
                  </a>
                  {' '}and paste your bot token here
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: OIDC Configuration */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200 border-b border-slate-600 pb-2">SSO/OIDC Authentication (Optional)</h3>
              <p className="text-sm text-slate-400">Configure OIDC/SSO for user authentication</p>

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
                      placeholder="Authentik, Keycloak, etc."
                      value={config.oidcProviderName}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="oidcDiscoveryUrl" className="block text-sm font-medium text-slate-300">
                      Discovery URL <span className="text-red-400">*</span>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="oidcClientId" className="block text-sm font-medium text-slate-300">
                        Client ID <span className="text-red-400">*</span>
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
                        Client Secret <span className="text-red-400">*</span>
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
                  </div>

                  {config.oidcDiscoveryUrl && (
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={testOIDCDiscovery}
                        disabled={testingStates.oidc}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-600 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {testingStates.oidc ? (
                          <>
                            <span className="animate-spin">⊙</span> Testing...
                          </>
                        ) : testResults.oidc === true ? (
                          <>✓ Discovery successful</>
                        ) : testResults.oidc === false ? (
                          <>✗ Discovery failed</>
                        ) : (
                          <>Test OIDC Discovery</>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="flex-1 py-2 px-4 border border-slate-600 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep(step + 1)
                }}
                disabled={!canProceed()}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !canProceed()}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}