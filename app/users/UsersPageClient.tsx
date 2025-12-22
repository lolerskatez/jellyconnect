"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"

interface UserPolicy {
  IsAdministrator: boolean
  IsHidden: boolean
  IsDisabled: boolean
  EnableContentDeletion: boolean
  EnableAllFolders: boolean
}

interface User {
  Id: string
  Name: string
  Policy?: UserPolicy
  HasPassword: boolean
  LastLoginDate?: string
  LastActivityDate?: string
  EnableAutoLogin?: boolean
  email?: string
  discordId?: string
  slackId?: string
  telegramId?: string
  webhookUrl?: string
  expiresAt?: string
}

export default function UsersPageClient() {
  const router = useRouter()
  const { admin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()

      // Get additional information for each user
      const usersWithDetails = await Promise.all(
        data.map(async (user: User) => {
          const userDetails = { ...user }

          // Fetch contacts
          try {
            const contactsRes = await fetch(`/api/users/${user.Id}/contacts`)
            if (contactsRes.ok) {
              const contacts = await contactsRes.json()
              Object.assign(userDetails, contacts)
            }
          } catch (err) {
            console.error(`Failed to fetch contacts for user ${user.Id}:`, err)
          }

          // Fetch expiry information
          try {
            const expiryRes = await fetch(`/api/users/${user.Id}/expiry`)
            if (expiryRes.ok) {
              const expiryData = await expiryRes.json()
              userDetails.expiresAt = expiryData.expiresAt
            }
          } catch (err) {
            console.error(`Failed to fetch expiry for user ${user.Id}:`, err)
          }

          return userDetails
        })
      )

      setUsers(usersWithDetails)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  // Filter users based on search term and filters
  useEffect(() => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.discordId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.slackId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.telegramId?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => {
        const userRole = getUserRole(user).toLowerCase().replace(" ", "")
        return userRole === roleFilter
      })
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(user => {
        if (statusFilter === "active") return !user.Policy?.IsDisabled
        if (statusFilter === "disabled") return user.Policy?.IsDisabled
        if (statusFilter === "expiring") return user.expiresAt && new Date(user.expiresAt) > new Date() && new Date(user.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        return true
      })
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter, statusFilter])

  const deleteUser = async (userId: string, userName: string) => {
    // Prevent admin from deleting their own account
    if (admin?.id === userId) {
      alert("You cannot delete your own account to prevent admin lockout.")
      return
    }

    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) return
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete user")
      await fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user")
    }
  }

  const getUserRole = (user: User): string => {
    if (user.Policy?.IsAdministrator) return "Admin"
    if (user.Policy?.EnableContentDeletion && user.Policy?.EnableAllFolders)
      return "Power User"
    return "User"
  }

  const getRoleColor = (user: User): string => {
    const role = getUserRole(user)
    if (role === "Admin") return "bg-red-900 text-red-200"
    if (role === "Power User") return "bg-blue-900 text-blue-200"
    return "bg-slate-700 text-slate-200"
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white flex items-center justify-center"><div className="text-xl">Loading users...</div></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Manage Users</h1>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white px-4 sm:px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 p-3 sm:p-4 rounded-lg shadow-lg">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">{users.length}</div>
            <div className="text-xs sm:text-sm text-slate-400">Total Users</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-3 sm:p-4 rounded-lg shadow-lg">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
              {users.filter(u => !u.Policy?.IsDisabled).length}
            </div>
            <div className="text-xs sm:text-sm text-slate-400">Active Users</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-3 sm:p-4 rounded-lg shadow-lg">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
              {users.filter(u => u.Policy?.IsAdministrator).length}
            </div>
            <div className="text-xs sm:text-sm text-slate-400">Administrators</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-3 sm:p-4 rounded-lg shadow-lg">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              {users.filter(u => u.expiresAt && new Date(u.expiresAt) > new Date() && new Date(u.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length}
            </div>
            <div className="text-xs sm:text-sm text-slate-400">Expiring Soon</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-lg mb-4">{error}</div>
        )}

        <button
          onClick={() => router.push("/users/create")}
          className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg mb-4 font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          + Create New User
        </button>

      {/* Search and Filter Controls */}
      <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-4 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-slate-300 mb-1">
              Search Users
            </label>
            <input
              id="search"
              type="text"
              placeholder="Name, email, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="roleFilter" className="block text-sm font-medium text-slate-300 mb-1">
              Role
            </label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="poweruser">Power User</option>
              <option value="user">User</option>
            </select>
          </div>
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-slate-300 mb-1">
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="expiring">Expiring Soon</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("")
                setRoleFilter("all")
                setStatusFilter("all")
              }}
              className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className="mt-2 text-sm text-slate-400">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse border border-slate-700">
          <thead className="bg-slate-800">
            <tr>
              <th className="border border-slate-700 p-3 text-left font-semibold text-slate-200">User</th>
              <th className="border border-slate-700 p-3 text-center font-semibold text-slate-200 w-24">Password</th>
              <th className="border border-slate-700 p-3 text-left font-semibold text-slate-200">Role</th>
              <th className="border border-slate-700 p-3 text-left font-semibold text-slate-200">Contacts</th>
              <th className="border border-slate-700 p-3 text-left font-semibold text-slate-200 w-64">Activity</th>
              <th className="border border-slate-700 p-3 text-left font-semibold text-slate-200">Status</th>
              <th className="border border-slate-700 p-3 text-left font-semibold text-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800">
            {filteredUsers.map((user) => (
              <tr key={user.Id} className="hover:bg-slate-700 transition-colors duration-150">
                <td className="border border-slate-700 p-3">
                  <div className="font-medium text-white">{user.Name}</div>
                </td>
                <td className="border border-slate-700 p-3 text-center w-24">
                  {user.HasPassword ? (
                    <svg className="w-5 h-5 text-green-400 inline-block" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-600 inline-block" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </td>
                <td className="border border-slate-700 p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user)}`}>
                    {getUserRole(user)}
                  </span>
                </td>
                <td className="border border-slate-700 p-3">
                  <div className="text-sm space-y-1">
                    {user.email && (
                      <div className="flex items-center text-blue-400">
                        <span className="mr-1">📧</span>
                        <span className="truncate max-w-32" title={user.email}>{user.email}</span>
                      </div>
                    )}
                    {user.discordId && (
                      <div className="flex items-center text-indigo-400">
                        <span className="mr-1">💬</span>
                        <span className="truncate max-w-32" title={user.discordId}>{user.discordId}</span>
                      </div>
                    )}
                    {user.slackId && (
                      <div className="flex items-center text-purple-400">
                        <span className="mr-1">💬</span>
                        <span className="truncate max-w-32" title={user.slackId}>{user.slackId}</span>
                      </div>
                    )}
                    {user.telegramId && (
                      <div className="flex items-center text-blue-300">
                        <span className="mr-1">✈️</span>
                        <span className="truncate max-w-32" title={user.telegramId}>{user.telegramId}</span>
                      </div>
                    )}
                    {user.webhookUrl && (
                      <div className="flex items-center text-slate-400">
                        <span className="mr-1">🔗</span>
                        <span className="truncate max-w-32" title={user.webhookUrl}>Webhook</span>
                      </div>
                    )}
                    {!user.email && !user.discordId && !user.slackId && !user.telegramId && !user.webhookUrl && (
                      <span className="text-slate-500 text-xs">No contacts</span>
                    )}
                  </div>
                </td>
                <td className="border border-slate-700 p-3">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-slate-400">Login:</span>
                        <span className="text-slate-200 ml-1">
                          {user.LastLoginDate
                            ? new Date(user.LastLoginDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
                            : 'Never'
                          }
                        </span>
                      </div>
                      <div className="text-slate-600">|</div>
                      <div>
                        <span className="text-slate-400">Activity:</span>
                        <span className="text-slate-200 ml-1">
                          {user.LastActivityDate
                            ? new Date(user.LastActivityDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                    {user.expiresAt && (
                      <div>
                        <span className="text-slate-400">Expires:</span>
                        <span className="text-orange-400 font-medium ml-1">
                          {new Date(user.expiresAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="border border-slate-700 p-3">
                  <div className="space-y-1">
                    {user.Policy?.IsDisabled ? (
                      <span className="px-2 py-1 bg-red-900 text-red-200 rounded-full text-xs font-medium">
                        Disabled
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-900 text-green-200 rounded-full text-xs font-medium">
                        Active
                      </span>
                    )}
                    {user.EnableAutoLogin && (
                      <div className="text-xs text-blue-400 mt-1">
                        🔓 Auto-login enabled
                      </div>
                    )}
                  </div>
                </td>
                <td className="border border-slate-700 p-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push(`/users/${user.Id}`)}
                      className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <div className="relative group inline-block">
                      <button
                        onClick={() => deleteUser(user.Id, user.Name)}
                        disabled={admin?.id === user.Id}
                        className={`text-sm font-medium transition-colors ${
                          admin?.id === user.Id
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-red-400 hover:text-red-300'
                        }`}
                      >
                        Delete
                      </button>
                      {admin?.id === user.Id && (
                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-slate-900 text-slate-300 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                          Cannot delete own account
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filteredUsers.map((user) => (
          <div key={user.Id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg">
            {/* Header row with name, role, status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-lg">{user.Name}</span>
                {user.HasPassword && (
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user)}`}>
                  {getUserRole(user)}
                </span>
                {user.Policy?.IsDisabled ? (
                  <span className="px-2 py-1 bg-red-900 text-red-200 rounded-full text-xs font-medium">
                    Disabled
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-green-900 text-green-200 rounded-full text-xs font-medium">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Contacts Section */}
            <div className="mb-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {user.email && (
                  <span className="inline-flex items-center text-blue-400 bg-blue-900/30 px-2 py-1 rounded text-xs">
                    📧 {user.email}
                  </span>
                )}
                {user.discordId && (
                  <span className="inline-flex items-center text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded text-xs">
                    💬 Discord
                  </span>
                )}
                {user.telegramId && (
                  <span className="inline-flex items-center text-blue-300 bg-blue-900/30 px-2 py-1 rounded text-xs">
                    ✈️ Telegram
                  </span>
                )}
                {user.webhookUrl && (
                  <span className="inline-flex items-center text-slate-400 bg-slate-700 px-2 py-1 rounded text-xs">
                    🔗 Webhook
                  </span>
                )}
              </div>
            </div>

            {/* Activity row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
              <span>
                Login: <span className="text-slate-200">{user.LastLoginDate ? new Date(user.LastLoginDate).toLocaleDateString() : 'Never'}</span>
              </span>
              <span>
                Activity: <span className="text-slate-200">{user.LastActivityDate ? new Date(user.LastActivityDate).toLocaleDateString() : 'Never'}</span>
              </span>
              {user.expiresAt && (
                <span>
                  Expires: <span className="text-orange-400 font-medium">{new Date(user.expiresAt).toLocaleDateString()}</span>
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-slate-700">
              <button
                onClick={() => router.push(`/users/${user.Id}`)}
                className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Edit User
              </button>
              <button
                onClick={() => deleteUser(user.Id, user.Name)}
                disabled={admin?.id === user.Id}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  admin?.id === user.Id
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                }`}
              >
                {admin?.id === user.Id ? 'Cannot Delete' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {filteredUsers.length === 0 && users.length > 0 && (
        <div className="text-slate-400 text-center mt-4 py-8">
          <div className="text-lg font-medium">No users match your filters</div>
          <div className="text-sm">Try adjusting your search or filter criteria</div>
        </div>
      )}
      {users.length === 0 && !loading && (
        <div className="text-slate-400 text-center mt-4 py-8">
          <div className="text-lg font-medium">No users found</div>
          <div className="text-sm">Create your first user to get started</div>
        </div>
      )}
      </div>
    </div>
  )
}