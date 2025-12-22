"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface PublicUser {
  id: string
  name: string
  token: string
}

interface PublicAuthContextType {
  user: PublicUser | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const PublicAuthContext = createContext<PublicAuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {}
})

export function usePublicAuth() {
  return useContext(PublicAuthContext)
}

export default function PublicAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  
  // Set mounted state to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Load session on mount
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return
    
    const token = localStorage.getItem('public_token')
    const userData = localStorage.getItem('public_user')
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        localStorage.removeItem('public_token')
        localStorage.removeItem('public_user')
      }
    }
  }, [isMounted])
  
  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/public/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (res.ok) {
        const data = await res.json()
        const publicUser: PublicUser = {
          id: data.user.Id,
          name: data.user.Name,
          token: data.token
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('public_token', data.token)
          localStorage.setItem('public_user', JSON.stringify(publicUser))
        }
        setUser(publicUser)
        return true
      }
      return false
    } catch (error) {
      console.error('Public login error:', error)
      return false
    }
  }
  
  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('public_token')
      localStorage.removeItem('public_user')
    }
    setUser(null)
  }

  return (
    <PublicAuthContext.Provider value={{ user, login, logout }}>
      {children}
    </PublicAuthContext.Provider>
  )
}
