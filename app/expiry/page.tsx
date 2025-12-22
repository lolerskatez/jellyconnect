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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="p-4 max-w-6xl mx-auto">
        <div className="text-center py-8 text-slate-200">Loading expiry data...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Account Expiry Dashboard</h1>
          <button
            onClick={triggerExpiryCheck}
            disabled={triggeringCheck}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
          >
            {triggeringCheck ? 'Running...' : 'Run Expiry Check'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded mb-4">{error}</div>
        )}

        {/* Expiring Users Section */}
        <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-white">Accounts Expiring Soon (Next 30 Days)</h2>
          {expiringUsers.length === 0 ? (
            <p className="text-slate-400">No accounts expiring soon.</p>
          ) : (
            <div className="space-y-4">
              {expiringUsers.map(({ user, daysUntilExpiry }) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-700 bg-slate-900/50 rounded-lg gap-4">
                  <div>
                    <h3 className="font-medium text-white">{user.name}</h3>
                    <p className="text-sm text-orange-400">
                      Expires: {new Date(user.expiresAt).toLocaleDateString()} ({daysUntilExpiry} days)
                    </p>
                    {user.email && <p className="text-sm text-slate-400">📧 {user.email}</p>}
                    {user.discordId && <p className="text-sm text-slate-400">💬 {user.discordId}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => extendUserExpiry(user.id, 30)}
                      className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      +30 days
                    </button>
                    <button
                      onClick={() => extendUserExpiry(user.id, 7)}
                      className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      +7 days
                    </button>
                    <button
                      onClick={() => router.push(`/users/${user.id}`)}
                      className="flex-1 sm:flex-none bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-sm transition-colors"
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
        <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg shadow-lg">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-white">Expired Accounts (Disabled)</h2>
          {expiredUsers.length === 0 ? (
            <p className="text-slate-400">No expired accounts.</p>
          ) : (
            <div className="space-y-4">
              {expiredUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-red-800 bg-red-900/30 rounded-lg gap-4">
                  <div>
                    <h3 className="font-medium text-white">{user.name}</h3>
                    <p className="text-sm text-red-400">
                      Expired: {new Date(user.expiresAt).toLocaleDateString()}
                    </p>
                    {user.email && <p className="text-sm text-slate-400">📧 {user.email}</p>}
                    {user.discordId && <p className="text-sm text-slate-400">💬 {user.discordId}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => extendUserExpiry(user.id, 30)}
                      className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      Re-enable (+30 days)
                    </button>
                    <button
                      onClick={() => router.push(`/users/${user.id}`)}
                      className="flex-1 sm:flex-none bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-sm transition-colors"
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