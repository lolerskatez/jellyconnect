"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { UserRole, getRolePermissions } from "./lib/roles"
import { NotificationProvider } from "../components/NotificationProvider"

interface AdminUser {
  id: string
  name: string
  displayName?: string
  isAdmin: boolean
  role: UserRole
  permissions: any
  token: string
}

interface AuthContextType {
  admin: AdminUser | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
  isConfigured: boolean | null
}

const AuthContext = createContext<AuthContextType>({
  admin: null,
  login: async () => false,
  logout: async () => {},
  isLoading: true,
  isConfigured: null
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    let isMounted = true
    console.log('[Providers] useEffect running')

    const initializeAuth = async () => {
      console.log('[Providers] initializeAuth starting')
      try {
        // Check for existing session first - try localStorage first for backward compatibility
        let token = localStorage.getItem('jellyfin_token')
        let userData = localStorage.getItem('user_data')
        
        // If no localStorage session, check the session endpoint (handles cookie-based sessions from OIDC)
        if (!token || !userData) {
          try {
            console.log('[Providers] Checking session endpoint for cookie-based session')
            const sessionRes = await fetch('/api/auth/session', {
              credentials: 'include', // Include httpOnly cookies
            })
            if (sessionRes.ok) {
              const sessionData = await sessionRes.json()
              if (sessionData.user) {
                token = sessionData.user.token
                userData = JSON.stringify({
                  id: sessionData.user.id,
                  name: sessionData.user.email?.split('@')[0] || 'User',
                  email: sessionData.user.email,
                  isAdmin: true,
                  role: 'admin' as any,
                  permissions: {},
                  token: sessionData.user.token,
                })
                console.log('[Providers] Session found from cookie')
                // Store in localStorage for next visit
                localStorage.setItem('jellyfin_token', token)
                localStorage.setItem('user_data', userData)
              }
            }
          } catch (error) {
            console.log('[Providers] Session endpoint error:', error)
          }
        }
        
        if (token && userData) {
          try {
            const parsedAdmin = JSON.parse(userData)
            if (isMounted) {
              console.log('[Providers] Setting admin from session')
              setAdmin(parsedAdmin)
            }
          } catch (error) {
            localStorage.removeItem('jellyfin_token')
            localStorage.removeItem('user_data')
          }
        }

        // Check configuration
        try {
          console.log('[Providers] Fetching config status')
          const res = await fetch('/api/config/status')
          if (isMounted) {
            const data = await res.json()
            console.log('[Providers] Config data:', data)
            setIsConfigured(data.isConfigured)
          }
        } catch (error) {
          console.log('[Providers] Config fetch error:', error)
          if (isMounted) {
            setIsConfigured(false)
          }
        }
      } finally {
        // Always set loading to false, even if there were errors
        console.log('[Providers] Setting isLoading to false, isMounted:', isMounted)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Start initialization
    initializeAuth()

    // Cleanup function
    return () => {
      console.log('[Providers] Cleanup - unmounting')
      isMounted = false
    }
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (res.ok) {
        const data = await res.json()
        const isJellyfinAdmin = data.user.Policy?.IsAdministrator || false
        // Determine app mode based on port: 3001 = public, 3000 = admin
        const appMode = typeof window !== 'undefined' && window.location.port === '3001' ? 'public' : 'admin'
        
        // In admin mode, require administrator access
        if (appMode === 'admin' && !isJellyfinAdmin) {
          throw new Error('Administrator access required')
        }

        const role = isJellyfinAdmin ? UserRole.ADMIN : UserRole.USER
        const permissions = getRolePermissions(role)

        const adminUser: AdminUser = {
          id: data.user.Id,
          name: data.user.Name,
          displayName: data.displayName,
          isAdmin: isJellyfinAdmin,
          role,
          permissions,
          token: data.token
        }

        localStorage.setItem('jellyfin_token', data.token)
        localStorage.setItem('user_data', JSON.stringify(adminUser))
        setAdmin(adminUser)
        return true
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async () => {
    // Clear the httpOnly session cookie via API
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout API error:', error)
    }
    
    // Clear localStorage
    localStorage.removeItem('jellyfin_token')
    localStorage.removeItem('user_data')
    setAdmin(null)
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ admin, login, logout, isLoading, isConfigured }}>
      <NotificationProvider userId={admin?.id}>
        {children}
      </NotificationProvider>
    </AuthContext.Provider>
  )
}