"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"

interface ExpiringUser {
  user: {
    id: string
    name: string
    email?: string
    discordId?: string
    expiresAt: string
  }
  daysUntilExpiry: number
}

interface ExpiredUser {
  id: string
  name: string
  email?: string
  discordId?: string
  expiresAt: string
}

export default function ExpiryDashboard() {
  const router = useRouter()
  const { admin } = useAuth()
  const [expiringUsers, setExpiringUsers] = useState<ExpiringUser[]>([])
  const [expiredUsers, setExpiredUsers] = useState<ExpiredUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggeringCheck, setTriggeringCheck] = useState(false)

  useEffect(() => {
    if (!admin) {
      router.push('/login')
      return
    }
    fetchExpiryData()
  }, [admin, router])

  const fetchExpiryData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch expiring users (next 30 days)
      const expiringRes = await fetch('/api/admin/expiring-users?days=30')
      if (expiringRes.ok) {
        const expiringData = await expiringRes.json()
        setExpiringUsers(expiringData)
      }

      // Fetch expired users
      const expiredRes = await fetch('/api/admin/expired-users')
      if (expiredRes.ok) {
        const expiredData = await expiredRes.json()
        setExpiredUsers(expiredData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expiry data')
    } finally {
      setLoading(false)
    }
  }

  const triggerExpiryCheck = async () => {
    try {
      setTriggeringCheck(true)
      const res = await fetch('/api/admin/trigger-expiry-check', {
        method: 'POST'
      })

      if (res.ok) {
        alert('Expiry check completed successfully!')
        // Refresh the data
        await fetchExpiryData()
      } else {
        alert('Failed to trigger expiry check')
      }
    } catch (err) {
      alert('Error triggering expiry check')
    } finally {
      setTriggeringCheck(false)
    }
  }

  const extendUserExpiry = async (userId: string, days: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/extend-expiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      })

      if (res.ok) {
        alert(`Extended user expiry by ${days} days`)
        await fetchExpiryData()
      } else {
        alert('Failed to extend user expiry')
      }
    } catch (err) {
      alert('Error extending user expiry')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 max-w-6xl mx-auto">
        <div className="text-center py-8">Loading expiry data...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Account Expiry Dashboard</h1>
          <button
            onClick={triggerExpiryCheck}
            disabled={triggeringCheck}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {triggeringCheck ? 'Running...' : 'Run Expiry Check'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>
        )}

        {/* Expiring Users Section */}
        <div className="bg-white p-6 rounded border border-gray-200 mb-6">
          <h2 className="text-xl font-bold mb-4">Accounts Expiring Soon (Next 30 Days)</h2>
          {expiringUsers.length === 0 ? (
            <p className="text-gray-500">No accounts expiring soon.</p>
          ) : (
            <div className="space-y-4">
              {expiringUsers.map(({ user, daysUntilExpiry }) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded">
                  <div>
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-gray-600">
                      Expires: {new Date(user.expiresAt).toLocaleDateString()} ({daysUntilExpiry} days)
                    </p>
                    {user.email && <p className="text-sm text-gray-500">Email: {user.email}</p>}
                    {user.discordId && <p className="text-sm text-gray-500">Discord: {user.discordId}</p>}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => extendUserExpiry(user.id, 30)}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      +30 days
                    </button>
                    <button
                      onClick={() => extendUserExpiry(user.id, 7)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      +7 days
                    </button>
                    <button
                      onClick={() => router.push(`/users/${user.id}`)}
                      className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expired Users Section */}
        <div className="bg-white p-6 rounded border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Expired Accounts (Disabled)</h2>
          {expiredUsers.length === 0 ? (
            <p className="text-gray-500">No expired accounts.</p>
          ) : (
            <div className="space-y-4">
              {expiredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded">
                  <div>
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-red-600">
                      Expired: {new Date(user.expiresAt).toLocaleDateString()}
                    </p>
                    {user.email && <p className="text-sm text-gray-500">Email: {user.email}</p>}
                    {user.discordId && <p className="text-sm text-gray-500">Discord: {user.discordId}</p>}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => extendUserExpiry(user.id, 30)}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      Re-enable (+30 days)
                    </button>
                    <button
                      onClick={() => router.push(`/users/${user.id}`)}
                      className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}