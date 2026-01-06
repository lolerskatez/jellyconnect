"use client"

import { useAuth } from "../providers"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "../components/Navigation"

export default function AdminDashboard() {
  const { admin, isLoading, isConfigured } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !admin) {
      router.push('/login')
      return
    }

    if (!isLoading && admin && !admin.isAdmin) {
      router.push('/')
      return
    }
  }, [admin, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!admin || !admin.isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="flex items-center justify-center flex-col py-32">
        <div className="text-center max-w-4xl px-4">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">Admin Dashboard</h1>
          <p className="text-lg text-slate-300 mb-12">Manage your Jellyfin users and system settings</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
            {/* User Management */}
            <Link href="/admin/users" className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">User Management</h3>
              <p className="text-slate-400">Create, view, and manage Jellyfin users</p>
            </Link>

            {/* Invites */}
            <Link href="/admin/invites" className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Invites</h3>
              <p className="text-slate-400">Manage user invitation codes and registration</p>
            </Link>

            {/* Settings */}
            <Link href="/admin/settings" className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Settings</h3>
              <p className="text-slate-400">Configure system settings and integrations</p>
            </Link>

            {/* Notifications */}
            <Link href="/admin/notifications" className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 012 21h13.78a3 3 0 002.442-1.742l1.657-2.773A5 5 0 0021.78 12H4.868z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Notifications</h3>
              <p className="text-slate-400">Manage user notifications and send bulk messages</p>
            </Link>

            {/* Account Expiry */}
            <Link href="/admin/expiry" className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Account Expiry</h3>
              <p className="text-slate-400">Monitor and manage expiring user accounts</p>
            </Link>

            {/* Quick Connect */}
            <Link href="/quickconnect" className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4.243 4.243m9.878-9.878l2.121 2.121m0 5.656l2.121 2.121M9 11H7m12 0h-2m1 8H8m4 0h4m-11-11l1.414-1.414M19.07 4.93L17.656 6.344" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Quick Connect</h3>
              <p className="text-slate-400">Initiate Quick Connect sessions</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}