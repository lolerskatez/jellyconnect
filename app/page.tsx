"use client"

import { useAuth } from "./providers"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "./components/Navigation"

function HomeContent({ admin, appMode, onOpenJellyfin, onQuickConnect }: { admin?: any, appMode: string, onOpenJellyfin?: () => void, onQuickConnect?: () => void }) {
  if (appMode === 'public' && admin) {
    // Public mode user dashboard
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="flex items-center justify-center flex-col py-32">
          <div className="text-center max-w-2xl px-4">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Welcome to JellyConnect</h1>
            <p className="text-lg text-slate-300 mb-12">Access your personal media library with seamless authentication</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onOpenJellyfin}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-lg text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M17.657 17.657a8 8 0 00-11.314-11.314M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Open Jellyfin
                </span>
              </button>
              <button
                onClick={onQuickConnect}
                className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-lg text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 inline-flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4.243 4.243m9.878-9.878l2.121 2.121m0 5.656l2.121 2.121M9 11H7m12 0h-2m1 8H8m4 0h4m-11-11l1.414-1.414M19.07 4.93L17.656 6.344" />
                </svg>
                Quick Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Admin mode dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="flex items-center justify-center flex-col py-32">
        <div className="text-center max-w-3xl px-4">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Welcome to JellyConnect</h1>
          <p className="text-lg text-slate-300 mb-12">Manage your Jellyfin instance and users</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <button
              onClick={onOpenJellyfin}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M17.657 17.657a8 8 0 00-11.314-11.314M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Open Jellyfin
            </button>
            <button
              onClick={onQuickConnect}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4.243 4.243m9.878-9.878l2.121 2.121m0 5.656l2.121 2.121M9 11H7m12 0h-2m1 8H8m4 0h4m-11-11l1.414-1.414M19.07 4.93L17.656 6.344" />
              </svg>
              Quick Connect
            </button>
            <Link href="/users" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 inline-flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Manage Users
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { admin, isLoading, isConfigured } = useAuth()
  const router = useRouter()
  const [showQuickConnectModal, setShowQuickConnectModal] = useState(false)
  const [quickConnectCode, setQuickConnectCode] = useState('')
  const [approving, setApproving] = useState(false)
  const [approveMessage, setApproveMessage] = useState('')
  const [appMode, setAppMode] = useState('admin')
  
  // Determine app mode based on port after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppMode(window.location.port === '3001' ? 'public' : 'admin')
    }
  }, [])

  useEffect(() => {
    console.log('Home page state:', { admin: !!admin, isLoading, isConfigured, appMode })
    if (!isLoading && !admin) {
      // Not logged in, redirect to login (both admin and public modes require login)
      console.log('Redirecting to login page')
      setTimeout(() => router.replace('/login'), 0)
    }
  }, [admin, isLoading, isConfigured, router, appMode])

  const handleOpenJellyfin = async () => {
    try {
      const response = await fetch('/api/config/status')
      const config = await response.json()
      
      console.log('[Open Jellyfin] Config response:', config)
      
      if (config.isConfigured && config.jellyfinUrl) {
        // Open Jellyfin with Quick Connect login page
        window.open(`${config.jellyfinUrl}/web/index.html#!/login.html`, '_blank')
        
        // Show modal to enter Quick Connect code
        setShowQuickConnectModal(true)
      } else {
        console.error('[Open Jellyfin] Config not valid:', config)
        alert(`Jellyfin is not configured. Config: ${JSON.stringify(config)}`)
      }
    } catch (error) {
      console.error('[Open Jellyfin] Error:', error)
      alert('Failed to get Jellyfin configuration: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleQuickConnect = () => {
    // Just show the modal without opening Jellyfin
    // User has Jellyfin already open elsewhere (TV, phone, etc.)
    setShowQuickConnectModal(true)
  }

  const handleApproveQuickConnect = async () => {
    if (!quickConnectCode.trim()) {
      setApproveMessage('Please enter a code')
      return
    }

    setApproving(true)
    setApproveMessage('')

    try {
      const response = await fetch('/api/quickconnect/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: quickConnectCode.trim() })
      })

      if (response.ok) {
        setApproveMessage('✓ Session approved! You can now use Jellyfin in the other tab.')
        setQuickConnectCode('')
        setTimeout(() => {
          setShowQuickConnectModal(false)
          setApproveMessage('')
        }, 3000)
      } else {
        const error = await response.json()
        setApproveMessage(`Error: ${error.error || 'Failed to approve session'}`)
      }
    } catch (error) {
      setApproveMessage('Error: Failed to connect to server')
    } finally {
      setApproving(false)
    }
  }

  // Show loading while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  // If not configured, show setup (admin mode only)
  if (appMode === 'admin' && isConfigured === false) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col">
        <h1 className="text-4xl font-bold mb-4">Welcome to JellyConnect</h1>
        <p className="mb-4">The service is not configured yet. Please set up your settings.</p>
        <Link href="/setup" className="bg-blue-500 text-white px-4 py-2 rounded">
          Go to Setup
        </Link>
      </div>
    )
  }

  // If configured but no user logged in, will redirect in useEffect
  // In public mode, we also require login before showing the dashboard
  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Redirecting to login...</div>
      </div>
    )
  }

  // User is logged in
  return (
    <>
      <HomeContent admin={admin} appMode={appMode} onOpenJellyfin={handleOpenJellyfin} onQuickConnect={handleQuickConnect} />
      
      {/* Quick Connect Modal */}
      {showQuickConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                Approve Jellyfin Session
              </h2>
              <button
                onClick={() => {
                  setShowQuickConnectModal(false)
                  setQuickConnectCode('')
                  setApproveMessage('')
                }}
                className="text-slate-400 hover:text-white flex-shrink-0 ml-2"
                aria-label="Close modal"
                title="Close"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">
              In Jellyfin, click &ldquo;<strong>Use Quick Connect</strong>&rdquo; on the login page, then enter the code here to approve the session:
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">
                  Quick Connect Code
                </label>
                <input
                  type="text"
                  value={quickConnectCode}
                  onChange={(e) => setQuickConnectCode(e.target.value.toUpperCase())}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-xl sm:text-2xl font-mono tracking-widest"
                  disabled={approving}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleApproveQuickConnect()
                    }
                  }}
                  autoFocus
                />
              </div>
              
              {approveMessage && (
                <div className={`p-2 sm:p-3 rounded-lg text-sm sm:text-base ${
                  approveMessage.startsWith('✓') 
                    ? 'bg-green-900/50 text-green-200 border border-green-700' 
                    : 'bg-red-900/50 text-red-200 border border-red-700'
                }`}>
                  {approveMessage}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleApproveQuickConnect}
                  disabled={approving || !quickConnectCode.trim()}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none text-sm sm:text-base"
                >
                  {approving ? 'Approving...' : 'Approve Session'}
                </button>
                <button
                  onClick={() => {
                    setShowQuickConnectModal(false)
                    setQuickConnectCode('')
                    setApproveMessage('')
                  }}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}