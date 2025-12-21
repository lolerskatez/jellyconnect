"use client"

import { useAuth } from "../providers"

// Custom useSession hook for admin authentication
export function useSession() {
  const { admin, isLoading } = useAuth()

  if (isLoading) {
    return { data: null, status: 'loading' }
  }

  if (admin) {
    return {
      data: {
        user: admin,
        expires: 'never' // Admin sessions don't expire in this implementation
      },
      status: 'authenticated'
    }
  }

  return { data: null, status: 'unauthenticated' }
}