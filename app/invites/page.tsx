"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"

interface Invite {
  id: string
  code: string
  createdBy: string
  profile: string
  maxUses?: number
  usedCount: number
  expiresAt?: string
  isActive: boolean
  createdAt: string
  email?: string
}

export default function InvitesPage() {
  const router = useRouter()
  const { admin, isLoading } = useAuth()
  
  // Declare ALL state hooks first, before any early returns
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState(() => {
    const defaultExpiry = new Date()
    defaultExpiry.setDate(defaultExpiry.getDate() + 30)
    return {
      profile: 'user',
      maxUses: '',
      expiresAt: defaultExpiry.toISOString().slice(0, 16),
      email: ''
    }
  })
  const [creating, setCreating] = useState(false)
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null)
  const [editForm, setEditForm] = useState({
    profile: 'user',
    maxUses: '',
    expiresAt: ''
  })
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [inviteUsages, setInviteUsages] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [createdInvite, setCreatedInvite] = useState<{code: string, email?: string} | null>(null)

  // Set up ALL effects BEFORE any early returns
  useEffect(() => {
    // Check if user is admin, if not redirect to login
    if (!isLoading && !admin) {
      router.push('/login')
      return
    }

    // Check if in public mode, redirect to home
    const appMode = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_APP_MODE : 'admin'
    if (appMode === 'public') {
      router.push('/')
      return
    }
  }, [admin, isLoading, router])

  useEffect(() => {
    // Only fetch if we're authenticated and in admin mode
    if (!isLoading && admin) {
      const appMode = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_APP_MODE : 'admin'
      if (appMode === 'admin') {
        fetchInvites()
      }
    }
  }, [isLoading, admin])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateForm(false)
        setEditingInvite(null)
        setShowDetails(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // NOW show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-slate-300">Loading...</div>
      </div>
    )
  }

  // NOW don't render if not admin (redirect will happen via useEffect)
  if (!admin) {
    return null
  }

  const fetchInvites = async () => {
    try {
      const res = await fetch("/api/invites/all")
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error)
    } finally {
      setLoading(false)
    }
  }

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: createForm.profile,
          maxUses: createForm.maxUses ? parseInt(createForm.maxUses) : undefined,
          expiresAt: createForm.expiresAt || undefined,
          email: createForm.email || undefined,
          createdBy: admin?.id
        })
      })

      if (res.ok) {
        const result = await res.json()
        setCreatedInvite({ code: result.code, email: result.email })
        setShowCreateForm(false)
        const defaultExpiry = new Date()
        defaultExpiry.setDate(defaultExpiry.getDate() + 30)
        setCreateForm({ profile: 'user', maxUses: '', expiresAt: defaultExpiry.toISOString().slice(0, 16), email: '' })
        await fetchInvites()
      } else {
        alert('Failed to create invite')
      }
    } catch (error) {
      console.error('Failed to create invite:', error)
      alert('Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const deleteInvite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invite? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch("/api/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        await fetchInvites();
      } else {
        alert('Failed to delete invite');
      }
    } catch (error) {
      console.error('Failed to delete invite:', error);
      alert('Failed to delete invite');
    }
  }

  const toggleInviteStatus = async (id: string, isActive: boolean) => {
    const action = isActive ? 'deactivate' : 'reactivate';
    const actionText = isActive ? 'deactivate' : 'reactivate';

    try {
      const res = await fetch("/api/invites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action })
      });

      if (res.ok) {
        await fetchInvites();
      } else {
        alert(`Failed to ${actionText} invite`);
      }
    } catch (error) {
      console.error(`Failed to ${actionText} invite:`, error);
      alert(`Failed to ${actionText} invite`);
    }
  }

  const startEdit = (invite: Invite) => {
    setEditingInvite(invite);
    setEditForm({
      profile: invite.profile,
      maxUses: invite.maxUses?.toString() || '',
      expiresAt: invite.expiresAt || ''
    });
  }

  const updateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvite) return;

    try {
      const res = await fetch("/api/invites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingInvite.id,
          action: 'update',
          updates: {
            profile: editForm.profile,
            maxUses: editForm.maxUses ? parseInt(editForm.maxUses) : undefined,
            expiresAt: editForm.expiresAt || undefined
          }
        })
      });

      if (res.ok) {
        setEditingInvite(null);
        await fetchInvites();
      } else {
        alert('Failed to update invite');
      }
    } catch (error) {
      console.error('Failed to update invite:', error);
      alert('Failed to update invite');
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    // Could add a toast notification here
  }

  const showInviteDetails = async (inviteId: string) => {
    if (showDetails === inviteId) {
      setShowDetails(null);
      return;
    }

    try {
      const res = await fetch(`/api/invites/${inviteId}`);
      if (res.ok) {
        const usages = await res.json();
        setInviteUsages(usages);
        setShowDetails(inviteId);
      }
    } catch (error) {
      console.error('Failed to fetch invite usages:', error);
    }
  }

  const filteredInvites = invites.filter(invite => {
    if (filter === 'active') return invite.isActive;
    if (filter === 'inactive') return !invite.isActive;
    return true;
  });

  if (loading) return <div className="p-4">Loading invites...</div>
  if (!admin) return <div>Redirecting...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Invite Management</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            + Create Invite
          </button>
        </div>

        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateForm(false)}>
            <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg sm:text-xl font-bold mb-4 text-white">Create New Invite</h2>
              <form onSubmit={createInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">User Profile</label>
                  <select
                    value={createForm.profile}
                    onChange={(e) => setCreateForm({...createForm, profile: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    aria-label="User profile for invite"
                    required
                  >
                    <option value="user">User</option>
                    <option value="powerUser">Power User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">Max Uses (leave empty for unlimited)</label>
                  <input
                    type="number"
                    value={createForm.maxUses}
                    onChange={(e) => setCreateForm({...createForm, maxUses: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Unlimited"
                    aria-label="Maximum number of uses for this invite"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">Expires At <span className="text-red-400">*</span></label>
                  <input
                    type="datetime-local"
                    value={createForm.expiresAt}
                    onChange={(e) => setCreateForm({...createForm, expiresAt: e.target.value})}
                    aria-label="Expiration date and time for this invite"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">All invites must have an expiration date</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">Email Address <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    aria-label="Email address for this invite"
                    placeholder="user@example.com"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">Email will be pre-filled when the user registers with this invite</p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    {creating ? 'Creating...' : 'Create Invite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingInvite && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setEditingInvite(null)}>
            <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg sm:text-xl font-bold mb-4 text-white">Edit Invite: {editingInvite.code}</h2>
              <form onSubmit={updateInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">User Profile</label>
                  <select
                    value={editForm.profile}
                    onChange={(e) => setEditForm({...editForm, profile: e.target.value})}
                    aria-label="User profile for editing invite"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="user">User</option>
                    <option value="powerUser">Power User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">Max Uses (leave empty for unlimited)</label>
                  <input
                    type="number"
                    value={editForm.maxUses}
                    onChange={(e) => setEditForm({...editForm, maxUses: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">Expires At (leave empty for no expiry)</label>
                  <input
                    type="datetime-local"
                    value={editForm.expiresAt}
                    onChange={(e) => setEditForm({...editForm, expiresAt: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    aria-label="Expiration date and time for edited invite"
                  />
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Update Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingInvite(null)}
                    className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDetails(null)}>
            <div className="bg-slate-800 border border-slate-700 p-8 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Invite Usage Details</h3>
                <button
                  onClick={() => setShowDetails(null)}
                  className="text-slate-400 hover:text-slate-200 text-2xl"
                >
                  ×
                </button>
              </div>
              {inviteUsages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-lg">No one has used this invite yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-orange-500">
                        <th className="px-6 py-4 text-left text-sm font-bold text-orange-400 uppercase tracking-wider">User ID</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-orange-400 uppercase tracking-wider">Used At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {inviteUsages.map((usage, index) => (
                        <tr key={usage.id} className="hover:bg-slate-700 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-slate-300 break-all">{usage.usedBy}</td>
                          <td className="px-6 py-4 text-sm text-slate-300 whitespace-nowrap">{new Date(usage.usedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-400">Total uses: {inviteUsages.length}</p>
              </div>
            </div>
          </div>
        )}

        {createdInvite && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setCreatedInvite(null)}>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Invite Created Successfully!</h3>
                <button
                  onClick={() => setCreatedInvite(null)}
                  className="text-slate-400 hover:text-slate-200 text-xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">Invite Code</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={createdInvite.code}
                      readOnly
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono"
                      aria-label="Generated invite code for copying"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(createdInvite.code)}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-3 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                </div>
                {createdInvite.email && (
                  <div className="bg-green-900 border border-green-700 rounded p-3">
                    <p className="text-sm text-green-200">
                      ✅ Invite email sent to <strong>{createdInvite.email}</strong>
                    </p>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => setCreatedInvite(null)}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-slate-200">Filter:</label>
            <select
              value={filter}
              aria-label="Filter invites by status"
              onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Invites</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Profile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Usage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {filteredInvites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-white">{invite.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        invite.profile === 'admin' ? 'bg-red-900 text-red-200' :
                        invite.profile === 'powerUser' ? 'bg-blue-900 text-blue-200' :
                        'bg-slate-700 text-slate-200'
                      }`}>
                        {invite.profile}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                      {invite.usedCount}{invite.maxUses ? `/${invite.maxUses}` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                      {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        invite.isActive ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`}>
                        {invite.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {invite.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                      {new Date(invite.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => copyToClipboard(invite.code)}
                        className="text-orange-400 hover:text-orange-300 text-xs"
                        title="Copy code"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => showInviteDetails(invite.id)}
                        className="text-purple-400 hover:text-purple-300 text-xs"
                        title="View details"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => startEdit(invite)}
                        className="text-green-400 hover:text-green-300 text-xs"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => toggleInviteStatus(invite.id, invite.isActive)}
                        className={`text-xs ${invite.isActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                        title={invite.isActive ? 'Deactivate' : 'Reactivate'}
                      >
                        {invite.isActive ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={() => deleteInvite(invite.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            <div className="divide-y divide-slate-700">
              {filteredInvites.map((invite) => (
                <div key={invite.id} className="p-4 hover:bg-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <code className="bg-slate-700 px-2 py-1 rounded text-sm font-mono text-white">{invite.code}</code>
                      <span className={`px-2 py-1 text-xs rounded ${
                        invite.profile === 'admin' ? 'bg-red-900 text-red-200' :
                        invite.profile === 'powerUser' ? 'bg-blue-900 text-blue-200' :
                        'bg-slate-700 text-slate-200'
                      }`}>
                        {invite.profile}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        invite.isActive ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`}>
                        {invite.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => copyToClipboard(invite.code)}
                        className="p-2 text-orange-400 hover:text-orange-300 hover:bg-slate-600 rounded"
                        title="Copy code"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => showInviteDetails(invite.id)}
                        className="p-2 text-purple-400 hover:text-purple-300 hover:bg-slate-600 rounded"
                        title="View details"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => startEdit(invite)}
                        className="p-2 text-green-400 hover:text-green-300 hover:bg-slate-600 rounded"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => toggleInviteStatus(invite.id, invite.isActive)}
                        className={`p-2 hover:bg-slate-600 rounded ${invite.isActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                        title={invite.isActive ? 'Deactivate' : 'Reactivate'}
                      >
                        {invite.isActive ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={() => deleteInvite(invite.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-600 rounded"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Usage:</span>
                      <div className="text-slate-200">{invite.usedCount}{invite.maxUses ? `/${invite.maxUses}` : ''}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Expires:</span>
                      <div className="text-slate-200">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Never'}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400">Email:</span>
                      <div className="text-slate-200">{invite.email || '-'}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400">Created:</span>
                      <div className="text-slate-200">{new Date(invite.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {invites.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No invites created yet. Click &ldquo;Create Invite&rdquo; to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}