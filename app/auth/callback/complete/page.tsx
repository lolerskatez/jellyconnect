"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function CallbackCompletePage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

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
            // Session found, store in localStorage and redirect to home
            if (typeof window !== 'undefined') {
              localStorage.setItem('jellyfin_token', sessionData.user.token)
              localStorage.setItem('user_data', JSON.stringify({
                id: sessionData.user.id,
                name: sessionData.user.email?.split('@')[0] || 'User',
                email: sessionData.user.email,
                isAdmin: true,
                role: 'admin',
                permissions: {},
                token: sessionData.user.token,
              }))
            }
            
            // Redirect to home
            router.push('/')
            return
          }
        }
        
        // If no session, try again after a short delay
        setTimeout(checkSessionAndRedirect, 500)
      } catch (error) {
        console.error('Failed to check session:', error)
        // Retry on error
        setTimeout(checkSessionAndRedirect, 500)
      }
    }

    // Start checking
    checkSessionAndRedirect()
  }, [router, isMounted])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        <div className="text-slate-300 mb-4">Completing login...</div>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    </div>
  )
}
