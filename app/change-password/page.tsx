"use client"

import { useState } from "react"
import { useAuth } from "../providers"
import Navigation from "../components/Navigation"
import { useRouter } from "next/navigation"

export default function ChangePasswordPage() {
  const { admin } = useAuth()
  const router = useRouter()
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!admin) {
    return null
  }

  // Redirect SSO users - they can't change password
  if (admin.oidcProvider) {
    router.push('/profile')
    return null
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Validation
    if (!passwordForm.currentPassword) {
      setError('Current password is required')
      setLoading(false)
      return
    }
    if (!passwordForm.newPassword) {
      setError('New password is required')
      setLoading(false)
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      setLoading(false)
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/users/' + admin.id + '/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      if (res.ok) {
        setSuccess('Password changed successfully')
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to change password')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-900 border border-green-700 rounded-lg">
            <p className="text-green-200">{success}</p>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-700">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Change Password</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">Update your account password</p>
          </div>

          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter your current password"
                  aria-label="Current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter your new password (min 8 characters)"
                  aria-label="New password"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Confirm your new password"
                  aria-label="Confirm new password"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-all"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 sm:flex-none border border-slate-600 text-slate-200 px-6 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
