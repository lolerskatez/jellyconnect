"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"

interface User {
  id: string
  name: string
  email: string
  jellyfinId?: string
  createdAt: string
  lastLogin?: string
  expiryDate?: string
  isAdmin: boolean
  roles: string[]
}

interface ExpiryStats {
  totalUsers: number
  expiringSoon: number
  expired: number
  active: number
}

export default function ExpiryPage() {
  const { admin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<ExpiryStats>({
    totalUsers: 0,
    expiringSoon: 0,
    expired: 0,
    active: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired' | 'active'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (admin) {
      fetchUsers()
      fetchStats()
    }
  }, [admin])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else {
        setError('Failed to fetch users')
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/statistics')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const updateExpiryDate = async (userId: string, expiryDate: string) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/users/${userId}/expiry`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiryDate })
      })

      if (response.ok) {
        setUsers(prev =>
          prev.map(user =>
            user.id === userId ? { ...user, expiryDate } : user
          )
        )
        setSelectedUser(null)
        setNewExpiryDate('')
        fetchStats() // Refresh stats
      } else {
        setError('Failed to update expiry date')
      }
    } catch (err) {
      console.error('Failed to update expiry date:', err)
      setError('Failed to update expiry date')
    } finally {
      setUpdating(false)
    }
  }

  const removeExpiryDate = async (userId: string) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/users/${userId}/expiry`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setUsers(prev =>
          prev.map(user =>
            user.id === userId ? { ...user, expiryDate: undefined } : user
          )
        )
        setSelectedUser(null)
        fetchStats() // Refresh stats
      } else {
        setError('Failed to remove expiry date')
      }
    } catch (err) {
      console.error('Failed to remove expiry date:', err)
      setError('Failed to remove expiry date')
    } finally {
      setUpdating(false)
    }
  }

  const triggerExpiryCheck = async () => {
    try {
      const response = await fetch('/api/admin/trigger-expiry-check', {
        method: 'POST'
      })

      if (response.ok) {
        alert('Expiry check triggered successfully')
        fetchUsers()
        fetchStats()
      } else {
        alert('Failed to trigger expiry check')
      }
    } catch (err) {
      console.error('Failed to trigger expiry check:', err)
      alert('Failed to trigger expiry check')
    }
  }

  const getExpiryStatus = (user: User) => {
    if (!user.expiryDate) return { status: 'active', color: 'text-green-400', bgColor: 'bg-green-900' }

    const now = new Date()
    const expiry = new Date(user.expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'text-red-400', bgColor: 'bg-red-900', days: Math.abs(daysUntilExpiry) }
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', color: 'text-yellow-400', bgColor: 'bg-yellow-900', days: daysUntilExpiry }
    } else {
      return { status: 'active', color: 'text-green-400', bgColor: 'bg-green-900', days: daysUntilExpiry }
    }
  }

  const filteredUsers = users.filter(user => {
    const expiryStatus = getExpiryStatus(user)
    const matchesFilter = filter === 'all' ||
      (filter === 'expiring' && expiryStatus.status === 'expiring') ||
      (filter === 'expired' && expiryStatus.status === 'expired') ||
      (filter === 'active' && expiryStatus.status === 'active')

    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesFilter && matchesSearch
  })

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="p-4 max-w-4xl mx-auto">
          <div className="bg-red-900 text-red-200 p-4 rounded-lg border border-red-700">
            Access denied. Administrator privileges required.
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="p-4 max-w-4xl mx-auto">
          <div className="text-center text-white">Loading expiry management...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="p-4 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent mb-2">Account Expiry Management</h1>
          <p className="text-slate-400">Monitor and manage user account expiry dates</p>
        </div>

        {error && (
          <div className="bg-red-900 text-red-200 p-4 rounded-lg border border-red-700 mb-6">{error}</div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{stats.totalUsers}</div>
            <div className="text-slate-400">Total Users</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            <div className="text-slate-400">Active</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{stats.expiringSoon}</div>
            <div className="text-slate-400">Expiring Soon</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-400">{stats.expired}</div>
            <div className="text-slate-400">Expired</div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Filter</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active</option>
                  <option value="expiring">Expiring Soon</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-400"
                />
              </div>
            </div>

            <button
              onClick={triggerExpiryCheck}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
            >
              Trigger Expiry Check
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 p-8 rounded-lg text-center">
              <div className="text-slate-400 text-lg mb-2">No users found</div>
              <div className="text-slate-500">Try adjusting your search or filter criteria.</div>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const expiryInfo = getExpiryStatus(user)
              return (
                <div key={user.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">{user.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${expiryInfo.bgColor} ${expiryInfo.color}`}>
                          {expiryInfo.status === 'expired' ? `Expired ${expiryInfo.days} days ago` :
                           expiryInfo.status === 'expiring' ? `Expires in ${expiryInfo.days} days` :
                           expiryInfo.status === 'active' && expiryInfo.days ? `Expires in ${expiryInfo.days} days` :
                           'No expiry set'}
                        </span>
                        {user.isAdmin && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-900 text-purple-200">
                            Admin
                          </span>
                        )}
                      </div>

                      <div className="text-slate-400 text-sm">
                        <div>Email: {user.email}</div>
                        <div>Created: {new Date(user.createdAt).toLocaleDateString()}</div>
                        {user.lastLogin && <div>Last Login: {new Date(user.lastLogin).toLocaleDateString()}</div>}
                        {user.expiryDate && <div>Expiry Date: {new Date(user.expiryDate).toLocaleDateString()}</div>}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
                      >
                        Set Expiry
                      </button>
                      {user.expiryDate && (
                        <button
                          onClick={() => removeExpiryDate(user.id)}
                          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-md transition-all duration-200 transform hover:scale-105 text-sm shadow-lg"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Expiry Date Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Set Expiry Date for {selectedUser.name}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => updateExpiryDate(selectedUser.id, newExpiryDate)}
                    disabled={!newExpiryDate || updating}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg"
                  >
                    {updating ? 'Updating...' : 'Set Expiry'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null)
                      setNewExpiryDate('')
                    }}
                    className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-md transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}