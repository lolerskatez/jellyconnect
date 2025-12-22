"use client"

import { useAuth } from "../providers"
import Navigation from "../components/Navigation"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const { admin } = useAuth()
  const router = useRouter()

  if (!admin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-700">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Profile</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">Manage your account information</p>
          </div>

          <div className="px-4 sm:px-6 py-6 sm:py-8">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 mb-8 pb-8 border-b border-slate-700">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {admin.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-semibold text-white">{admin.name}</h2>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                  admin.isAdmin 
                    ? 'bg-purple-900 text-purple-200' 
                    : 'bg-slate-700 text-slate-200'
                }`}>
                  {admin.isAdmin ? "Administrator" : "User"}
                </span>
              </div>
            </div>

            {/* Account Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400">Username</label>
                  <p className="mt-1 text-white">{admin.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400">Account Type</label>
                  <p className="mt-1 text-white">
                    {admin.isAdmin ? "Administrator" : "Regular User"}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.back()}
                className="w-full sm:w-auto border border-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
