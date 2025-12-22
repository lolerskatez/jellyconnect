"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const [config, setConfig] = useState({
    jellyfinUrl: '',
    adminUsername: '',
    adminPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/login')
      } else {
        setError(data.error || 'Failed to save configuration')
        console.error('Setup error:', data)
      }
    } catch (error) {
      setError('Error saving configuration: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-8 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
        <div>
          <h2 className="mt-2 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
            Setup JellyConnect
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Configure your Jellyfin server. SSO can be configured later.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="jellyfinUrl" className="block text-sm font-medium text-slate-300">
                Jellyfin Server URL
              </label>
              <input
                id="jellyfinUrl"
                name="jellyfinUrl"
                type="url"
                required
                autoComplete="url"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="http://localhost:8096"
                value={config.jellyfinUrl}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="adminUsername" className="block text-sm font-medium text-slate-300">
                Jellyfin Admin Username
              </label>
              <input
                id="adminUsername"
                name="adminUsername"
                type="text"
                required
                autoComplete="username"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="admin"
                value={config.adminUsername}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-slate-300">
                Jellyfin Admin Password
              </label>
              <input
                id="adminPassword"
                name="adminPassword"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Your Jellyfin Admin Password"
                value={config.adminPassword}
                onChange={handleChange}
              />
            </div>
          </div>
          {error && (
            <div className="rounded-md bg-red-900 border border-red-700 p-4">
              <p className="text-sm font-medium text-red-200">{error}</p>
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}