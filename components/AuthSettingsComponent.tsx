"use client"

import { useState, useEffect } from "react"
import { ChevronRight, InfoIcon, Plus, X } from "lucide-react"

interface AuthSettings {
  id: string
  appUrl?: string
  passwordAuthEnabled: boolean
  oidcEnabled: boolean
  forceOIDC: boolean
  oidcProviderName?: string
  oidcDiscoveryUrl?: string
  oidcClientId?: string
  oidcClientSecret?: string
  // OIDC Group to Role Mappings
  oidcAdminGroups?: string[]
  oidcPowerUserGroups?: string[]
  oidcUserGroups?: string[]
}

interface GroupMappingInputProps {
  groups: string[]
  onChange: (groups: string[]) => void
  placeholder: string
}

function GroupMappingInput({ groups, onChange, placeholder }: GroupMappingInputProps) {
  const [inputValue, setInputValue] = useState("")

  const addGroup = () => {
    const trimmed = inputValue.trim()
    if (trimmed && !groups.includes(trimmed)) {
      onChange([...groups, trimmed])
      setInputValue("")
    }
  }

  const removeGroup = (groupToRemove: string) => {
    onChange(groups.filter(g => g !== groupToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addGroup()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent text-sm"
        />
        <button
          type="button"
          onClick={addGroup}
          disabled={!inputValue.trim() || groups.includes(inputValue.trim())}
          className="px-3 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:opacity-50 text-slate-300 rounded text-sm transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((group, index) => (
            <div key={index} className="flex items-center gap-1 bg-slate-700 px-2 py-1 rounded text-xs text-slate-300">
              <span>{group}</span>
              <button
                type="button"
                onClick={() => removeGroup(group)}
                className="hover:text-red-400 transition-colors"
                aria-label={`Remove group ${group}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AuthSettingsComponent() {
  const [settings, setSettings] = useState<AuthSettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [appUrl, setAppUrl] = useState("")

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const url = window.location.origin
        setAppUrl(url)

        const res = await fetch('/api/settings/auth')
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
        } else {
          setErrorMessage('Failed to load auth settings')
        }
      } catch (error) {
        console.error('Error fetching auth settings:', error)
        setErrorMessage('Error loading settings')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleChange = (field: keyof AuthSettings, value: any) => {
    if (settings) {
      if (field === 'forceOIDC' && value && !settings.oidcEnabled) {
        setErrorMessage('Must enable OIDC before forcing SSO-only mode')
        return
      }

      if (field === 'oidcEnabled' && !value && settings.forceOIDC) {
        setSettings({
          ...settings,
          [field]: value,
          forceOIDC: false,
        })
        return
      }

      setSettings({ ...settings, [field]: value })
      setErrorMessage("")
      setSuccessMessage("")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccessMessage('Copied to clipboard!')
    setTimeout(() => setSuccessMessage(""), 2000)
  }

  const handleSave = async () => {
    if (!settings) return

    if (settings.forceOIDC && !settings.oidcEnabled) {
      setErrorMessage('Cannot enable SSO-only mode without OIDC enabled')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/settings/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        setSuccessMessage('Auth settings saved successfully')
        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        const error = await res.json()
        setErrorMessage(error.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving auth settings:', error)
      setErrorMessage('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-red-400">Failed to load authentication settings</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-700/30 text-green-300 p-4 rounded-lg flex items-start gap-3">
          <div className="text-green-400 mt-0.5">✓</div>
          <div>{successMessage}</div>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-900/20 border border-red-700/30 text-red-300 p-4 rounded-lg flex items-start gap-3">
          <div className="text-red-400 mt-0.5">✕</div>
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-lg flex gap-3">
        <InfoIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">Authentication Methods</p>
          <p className="opacity-90">Configure how users log in to your application. You can enable password authentication, SSO (OpenID Connect), or both.</p>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-700">
            <div>
              <h3 className="text-lg font-semibold text-slate-200">Single Sign-On (OpenID Connect)</h3>
              <p className="text-sm text-slate-400 mt-1">Enable external authentication via OIDC provider</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.oidcEnabled}
                  onChange={(e) => handleChange('oidcEnabled', e.target.checked)}
                  className="sr-only peer"
                  aria-label="Enable or disable OIDC single sign-on"
                />
                <div className="w-12 h-6 bg-slate-700 peer-checked:bg-orange-500 rounded-full transition-colors"></div>
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </div>
            </label>
          </div>

          {/* Application URL Configuration */}
          <div className="pt-6 border-t border-slate-700 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Application URL</label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="https://jc.tanjiro.one"
                  value={settings.appUrl || ''}
                  onChange={(e) => handleChange('appUrl', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                />
                <p className="text-xs text-slate-400">The public URL where JellyConnect is accessible (e.g., https://jc.tanjiro.one)</p>
                <button
                  type="button"
                  onClick={() => {
                    const detected = window.location.origin
                    handleChange('appUrl', detected)
                  }}
                  className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 transition-colors"
                >
                  Auto-detect from current URL ({window.location.origin})
                </button>
              </div>
            </div>
          </div>

          {/* OIDC Configuration - Only show if OIDC enabled */}
          {settings.oidcEnabled && (
            <div className="space-y-4 pt-2">
              {/* Provider Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Provider Name</label>
                <input
                  type="text"
                  placeholder="e.g., Authentik, Keycloak, Custom Identity Provider"
                  value={settings.oidcProviderName || ''}
                  onChange={(e) => handleChange('oidcProviderName', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* Discovery URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">OpenID Discovery URL</label>
                <input
                  type="text"
                  placeholder="https://your-provider.com/.well-known/openid-configuration"
                  value={settings.oidcDiscoveryUrl || ''}
                  onChange={(e) => handleChange('oidcDiscoveryUrl', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Usually found at: https://your-provider.com/.well-known/openid-configuration</p>
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Client ID</label>
                <input
                  type="text"
                  placeholder="Your OIDC client ID"
                  value={settings.oidcClientId || ''}
                  onChange={(e) => handleChange('oidcClientId', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* Client Secret */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Client Secret</label>
                <input
                  type="password"
                  placeholder="Your OIDC client secret"
                  value={settings.oidcClientSecret || ''}
                  onChange={(e) => handleChange('oidcClientSecret', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* OIDC Group to Role Mappings */}
              <div className="pt-6 border-t border-slate-700 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-200 mb-3">OIDC Group to Role Mappings</h4>
                  <p className="text-xs text-slate-400 mb-4">Configure which OIDC groups map to which Jellyfin user roles. Groups are checked in order of priority (Admin → Power User → User).</p>

                  {/* Administrator Groups */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-300 mb-2">Administrator Groups</label>
                    <GroupMappingInput
                      groups={settings.oidcAdminGroups || []}
                      onChange={(groups) => handleChange('oidcAdminGroups', groups)}
                      placeholder="e.g., Administrators, Admin"
                    />
                    <p className="text-xs text-slate-500 mt-1">Users in these groups will have full administrator access</p>
                  </div>

                  {/* Power User Groups */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-300 mb-2">Power User Groups</label>
                    <GroupMappingInput
                      groups={settings.oidcPowerUserGroups || []}
                      onChange={(groups) => handleChange('oidcPowerUserGroups', groups)}
                      placeholder="e.g., Power Users, Editors"
                    />
                    <p className="text-xs text-slate-500 mt-1">Users in these groups can manage media and access all libraries</p>
                  </div>

                  {/* User Groups */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-300 mb-2">User Groups</label>
                    <GroupMappingInput
                      groups={settings.oidcUserGroups || []}
                      onChange={(groups) => handleChange('oidcUserGroups', groups)}
                      placeholder="e.g., Users, Viewers"
                    />
                    <p className="text-xs text-slate-500 mt-1">Users in these groups have basic access (default for all other users)</p>
                  </div>

                  <div className="bg-blue-900/10 border border-blue-700/30 rounded-lg p-3 mt-4">
                    <div className="flex items-start gap-2">
                      <InfoIcon className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-300">
                        <p className="font-medium mb-1">How Group Mapping Works</p>
                        <p className="opacity-90">Users are assigned the highest role their groups grant. If no groups match, they get basic user access. Group names are matched case-insensitively.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Force OIDC */}
              <div className="pt-2 border-t border-slate-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.forceOIDC}
                      onChange={(e) => handleChange('forceOIDC', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 bg-slate-700 peer-checked:bg-orange-500 rounded border border-slate-600 peer-checked:border-orange-500 transition-colors"></div>
                    <div className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity text-xs flex items-center justify-center">✓</div>
                  </div>
                  <span className="text-sm text-slate-300">Require OIDC login (disable password authentication)</span>
                </label>
              </div>
            </div>
          )}

          {/* Password Authentication */}
          {!settings.forceOIDC && (
            <div className="pt-4 border-t border-slate-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.passwordAuthEnabled}
                    onChange={(e) => handleChange('passwordAuthEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 bg-slate-700 peer-checked:bg-orange-500 rounded border border-slate-600 peer-checked:border-orange-500 transition-colors"></div>
                  <div className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity text-xs flex items-center justify-center">✓</div>
                </div>
                <span className="text-sm text-slate-300">Allow password authentication</span>
              </label>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-700 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            {isSaving ? "Saving..." : "Save Changes"}
            {!isSaving && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
