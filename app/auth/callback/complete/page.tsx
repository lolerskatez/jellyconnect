"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function CallbackCompletePage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [disabledUserId, setDisabledUserId] = useState<string | null>(null)
  const MAX_RETRIES = 10 // Maximum 5 seconds of retries (10 * 500ms)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const checkSessionAndRedirect = async () => {
      try {
        // Check if session is available
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include', // Include httpOnly cookies
        })
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          if (sessionData.user) {
            let jellyfinToken = sessionData.user.token
            let jellyfinUser = null

            // For SSO users, authenticate with Jellyfin to get access token
            if (sessionData.user.oidcProvider && !jellyfinToken) {
              try {
                const authRes = await fetch('/api/auth/sso-auth', {
                  credentials: 'include',
                })
                if (authRes.ok) {
                  const authData = await authRes.json()
                  jellyfinToken = authData.token
                  jellyfinUser = authData.user
                } else {
                  // Check if account is disabled
                  const errorData = await authRes.json().catch(() => ({}))
                  if (errorData.code === 'ACCOUNT_DISABLED') {
                    setErrorMessage('Your account has been disabled.')
                    setDisabledUserId(errorData.userId || null)
                    return // Stop processing, show error UI
                  }
                  console.error('Failed to authenticate SSO user with Jellyfin:', authRes.status, errorData)
                }
              } catch (error) {
                console.error('Error authenticating SSO user with Jellyfin:', error)
              }
            }

            // Store in localStorage
            if (typeof window !== 'undefined' && jellyfinToken) {
              // Get admin status from Jellyfin policy - DO NOT default to true!
              const isAdmin = jellyfinUser?.Policy?.IsAdministrator === true
              const role = isAdmin ? 'admin' : 'user'
              
              localStorage.setItem('jellyfin_token', jellyfinToken)
              localStorage.setItem('user_data', JSON.stringify({
                id: sessionData.user.id,
                name: sessionData.user.name || sessionData.user.email?.split('@')[0] || 'User',
                displayName: sessionData.user.name || sessionData.user.email?.split('@')[0] || 'User',
                email: sessionData.user.email,
                isAdmin: isAdmin,
                role: role,
                permissions: {},
                token: jellyfinToken,
                oidcProvider: sessionData.user.oidcProvider,
              }))
            }
            
            // Redirect to home
            router.push('/')
            return
          }
        }
        
        // If no session, try again after a short delay (with max retries)
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1)
          setTimeout(checkSessionAndRedirect, 500)
        } else {
          // Max retries reached, redirect to home without session
          console.warn('Max session check retries reached, redirecting to home')
          router.push('/')
        }
      } catch (error) {
        console.error('Failed to check session:', error)
        // Retry on error (with max retries)
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1)
          setTimeout(checkSessionAndRedirect, 500)
        } else {
          // Max retries reached, redirect to home
          console.warn('Max session check retries reached after error, redirecting to home')
          router.push('/')
        }
      }
    }

    // Start checking
    checkSessionAndRedirect()
  }, [router, isMounted, retryCount])

  // Show account disabled error
  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md w-full mx-4 p-8 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Account Disabled</h2>
          <p className="text-slate-400 mb-6">
            {errorMessage} Please contact your administrator or unlock your account using the link below.
          </p>
          <div className="space-y-3">
            <a
              href={disabledUserId ? `/account-unlock?userId=${disabledUserId}` : '/account-unlock'}
              className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Unlock My Account
            </a>
            <a
              href="/login"
              className="block w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        <div className="text-slate-300 mb-4">Completing login...</div>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    </div>
  )
}
