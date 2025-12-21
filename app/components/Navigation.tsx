"use client"

import { useAuth } from "../providers"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { NotificationBell } from "../../components/NotificationBell"
import { useState } from "react"

export default function Navigation() {
  const { admin, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  // Determine app mode based on port: 3001 = public, 3000 = admin
  const appMode = typeof window !== 'undefined' && window.location.port === '3001' ? 'public' : 'admin'
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // In public mode, show minimal navigation
  if (appMode === 'public') {
    return (
      <nav className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
            JellyConnect
          </Link>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            title={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            {admin ? (
              <>
                <NotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {(admin.displayName || admin.name).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm">{admin.displayName || admin.name}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-10">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/user-settings"
                        className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Settings
                      </Link>
                      <hr className="my-1 border-slate-700" />
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          handleLogout()
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-slate-700 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/login' ? 'bg-orange-600' : 'hover:bg-slate-700'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/register' ? 'bg-orange-600' : 'hover:bg-slate-700'
                  }`}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 border-t border-slate-700 pt-4">
            {admin ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 px-3 py-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-base font-medium">
                      {(admin.displayName || admin.name).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  <span className="text-base font-medium">{admin.displayName || admin.name}</span>
                </div>
                <Link
                  href="/profile"
                  className="block px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-700 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/user-settings"
                  className="block px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-700 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-orange-400 hover:bg-slate-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/login"
                  className={`block px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/login' ? 'bg-orange-600' : 'hover:bg-slate-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={`block px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/register' ? 'bg-orange-600' : 'hover:bg-slate-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    )
  }

  // Admin mode navigation
  if (!admin) return null
  const { permissions } = admin
  return (
    <nav className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 text-white p-4 shadow-lg">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <Link href="/" className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              JellyConnect
            </Link>
            
            {/* Desktop nav links */}
            <div className="hidden lg:flex space-x-2">
              {permissions.canManageUsers && (
                <Link
                  href="/users"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/users' ? 'bg-orange-600' : 'hover:bg-slate-700'
                  }`}
                >
                  Users
                </Link>
              )}
              {permissions.canManageInvites && (
                <Link
                  href="/invites"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/invites' ? 'bg-orange-600' : 'hover:bg-slate-700'
                  }`}
                >
                  Invites
                </Link>
              )}
              <Link
                href="/notifications"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  pathname === '/notifications' ? 'bg-orange-600' : 'hover:bg-slate-700'
                }`}
              >
                Notifications
              </Link>
              {permissions.canViewSettings && (
                <Link
                  href="/settings"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/settings' ? 'bg-orange-600' : 'hover:bg-slate-700'
                  }`}
                >
                  Settings
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            title={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop profile menu */}
          <div className="hidden lg:flex items-center space-x-4">
            <NotificationBell />
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors duration-200"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {admin.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm">{admin.name}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-10">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/user-settings"
                    className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Settings
                  </Link>
                  <hr className="my-1 border-slate-700" />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false)
                      handleLogout()
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-slate-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 border-t border-slate-700 pt-4 space-y-2">
            {/* User profile in mobile menu */}
            <div className="flex items-center space-x-3 px-3 py-2 mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                <span className="text-base font-medium">
                  {admin.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-base font-medium">{admin.name}</span>
            </div>

            {/* Nav links */}
            {permissions.canManageUsers && (
              <Link
                href="/users"
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  pathname === '/users' ? 'bg-orange-600' : 'hover:bg-slate-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Users
              </Link>
            )}
            {permissions.canManageInvites && (
              <Link
                href="/invites"
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  pathname === '/invites' ? 'bg-orange-600' : 'hover:bg-slate-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Invites
              </Link>
            )}
            <Link
              href="/notifications"
              className={`block px-3 py-2 rounded-lg transition-colors ${
                pathname === '/notifications' ? 'bg-orange-600' : 'hover:bg-slate-700'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Notifications
            </Link>
            {permissions.canViewSettings && (
              <Link
                href="/settings"
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  pathname === '/settings' ? 'bg-orange-600' : 'hover:bg-slate-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>
            )}

            {/* Profile links */}
            <div className="border-t border-slate-700 pt-2 mt-2">
              <Link
                href="/profile"
                className="block px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-700 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/user-settings"
                className="block px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-700 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                className="block w-full text-left px-3 py-2 rounded-lg text-orange-400 hover:bg-slate-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}