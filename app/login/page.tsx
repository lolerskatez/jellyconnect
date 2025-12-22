"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { useAuth } from "../providers"

function LoginPageContent() {
  const { admin, login, isLoading, isConfigured } = useAuth()
  const [appMode, setAppMode] = useState('admin')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [enabledProviders, setEnabledProviders] = useState<string[]>([])
  const [showOIDC, setShowOIDC] = useState(false)
  const [oidcSigningIn, setOIDCSigningIn] = useState<string | null>(null)
  const [enableRegistration, setEnableRegistration] = useState(true)

  // Determine app mode based on port after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppMode(window.location.port === '3001' ? 'public' : 'admin')
    }
  }, [])

  useEffect(() => {
    // Redirect to home if already logged in
    if (!isLoading && admin) {
      router.push("/")
    }
  }, [admin, isLoading, router])

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(message)
    }
  }, [searchParams])

  useEffect(() => {
    // Fetch enabled OIDC providers
    const fetchProviders = async () => {
      try {
        const res = await fetch('/api/auth/providers')
        if (res.ok) {
          const data = await res.json()
          setEnabledProviders(data.enabledProviders || [])
          setShowOIDC(data.oidcEnabled || false)
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error)
      }
    }
    
    fetchProviders()
  }, [])

  useEffect(() => {
    // Fetch registration setting
    const fetchRegistrationSetting = async () => {
      try {
        const res = await fetch('/api/config/registration')
        if (res.ok) {
          const data = await res.json()
          setEnableRegistration(data.enableRegistration ?? true)
        }
      } catch (error) {
        console.error('Failed to fetch registration setting:', error)
        setEnableRegistration(true) // Default to enabled on error
      }
    }
    
    fetchRegistrationSetting()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoggingIn(true)

    const success = await login(username, password)
    
    if (success) {
      router.push('/')
    } else {
      setError(appMode === 'public' ? "Invalid username or password" : "Invalid username or password, or insufficient permissions")
    }
    
    setIsLoggingIn(false)
  }

  const handleOIDCSignIn = async (provider: string) => {
    setOIDCSigningIn(provider)
    try {
      // Get configuration from providers endpoint
      const providersRes = await fetch('/api/auth/providers')
      const providersData = await providersRes.json()
      
      if (!providersData.providers || providersData.providers.length === 0) {
        setError('OIDC provider not configured')
        setOIDCSigningIn(null)
        return
      }
      
      const callbackUrl = searchParams.get('callbackUrl') || '/'
      // Always use window.location.origin to ensure the redirect comes back to the same server
      // (admin on port 3000 or public on port 3001)
      const baseUrl = window.location.origin
      const redirectUri = `${baseUrl}/api/auth/callback/oidc`
      const state = Math.random().toString(36).substring(7)
      const nonce = Math.random().toString(36).substring(7)
      
      // Store state and callbackUrl for later verification
      sessionStorage.setItem(`auth_state_${state}`, JSON.stringify({ 
        callbackUrl, 
        nonce,
        timestamp: Date.now() 
      }))
      
      // Get provider details from the server
      const providerDetailsRes = await fetch('/api/auth/provider-details')
      const providerDetails = await providerDetailsRes.json()
      
      if (!providerDetails.authorizationEndpoint) {
        setError('Provider configuration missing authorization endpoint')
        setOIDCSigningIn(null)
        return
      }
      
      const params = new URLSearchParams({
        client_id: providerDetails.clientId,
        response_type: 'code',
        scope: 'openid profile email',
        redirect_uri: redirectUri,
        state: state,
        nonce: nonce,
      })
      
      console.log('[LOGIN] Redirecting to OIDC provider:', providerDetails.authorizationEndpoint)
      window.location.href = `${providerDetails.authorizationEndpoint}?${params.toString()}`
    } catch (error) {
      console.error(`Failed to sign in with ${provider}:`, error)
      setError(`Failed to sign in with ${provider}. Please try again.`)
      setOIDCSigningIn(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-slate-300">Loading...</div>
      </div>
    )
  }

  if (appMode === 'admin' && isConfigured === false) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">JellyConnect</h1>
        <p className="mb-4 text-slate-300">The service is not configured yet. Please set up your settings.</p>
        <button
          onClick={() => router.push("/setup")}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
        >
          Go to Setup
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
            {appMode === 'public' ? 'Sign in to JellyConnect' : 'Admin Sign In'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            {appMode === 'public' ? 'Access your personal media library' : 'Administrator access required'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="bg-green-900 border border-green-700 text-green-200 p-4 rounded-lg text-sm">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* OIDC Providers Section */}
          {showOIDC && enabledProviders.length > 0 && (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-slate-400">Sign in with SSO</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {enabledProviders.map((provider) => {
                  const providerNames: Record<string, string> = {
                    authentik: 'Authentik',
                    keycloak: 'Keycloak',
                    gitea: 'Gitea',
                    vaultwarden: 'Vaultwarden',
                  }
                  
                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => handleOIDCSignIn(provider)}
                      disabled={oidcSigningIn !== null}
                      className="w-full flex items-center justify-center px-4 py-3 border border-slate-600 rounded-lg text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                    >
                      {oidcSigningIn === provider ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing in...
                        </>
                      ) : (
                        'Sign in w/ SSO'
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Password Auth Section */}
          {!showOIDC || enabledProviders.length === 0 ? (
            <>
              {showOIDC && enabledProviders.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-slate-800 text-slate-400">Or sign in with password</span>
                  </div>
                </div>
              )}
              
              <div className="rounded-lg space-y-4">
                <div>
                  <label htmlFor="username" className="sr-only">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-slate-600 placeholder-slate-500 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-slate-600 placeholder-slate-500 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-slate-800 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
                >
                  {isLoggingIn ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowOIDC(false)}
              className="w-full text-slate-400 hover:text-slate-300 text-sm py-2 bg-transparent border-none transition-colors"
            >
              Sign in with password instead
            </button>
          )}
        </form>

        {appMode === 'public' && enableRegistration && (
          <div className="text-center">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                window.location.href = '/register'
              }}
              className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors duration-200 cursor-pointer bg-transparent border-none p-0"
            >
              Need an account? Register with invite code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
