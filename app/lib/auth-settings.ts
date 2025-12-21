import { database } from './db'

export function getAuthSettings() {
  let settings = database.authSettings[0]
  
  if (!settings) {
    // Create default settings if they don't exist
    settings = {
      id: 'default',
      passwordAuthEnabled: true,
      oidcEnabled: false,
      forceOIDC: false,
      updatedAt: new Date().toISOString(),
    }
    database.authSettings.push(settings)
  }
  
  return settings
}

export function updateAuthSettings(updates: Partial<typeof database.authSettings[0]>) {
  const settings = getAuthSettings()
  Object.assign(settings, updates, { updatedAt: new Date().toISOString() })
  return settings
}

export function isPasswordAuthEnabled(): boolean {
  const settings = getAuthSettings()
  return settings.passwordAuthEnabled && !settings.forceOIDC
}

export function isOIDCEnabled(): boolean {
  const settings = getAuthSettings()
  return settings.oidcEnabled && !!settings.oidcDiscoveryUrl && !!settings.oidcClientId
}

export function getOIDCProviderConfig() {
  const settings = getAuthSettings()
  
  if (!settings.oidcEnabled || !settings.oidcDiscoveryUrl || !settings.oidcClientId) {
    return null
  }
  
  // If endpoints are explicitly configured, use those
  if (settings.oidcAuthorizationEndpoint && settings.oidcTokenEndpoint && settings.oidcUserinfoEndpoint) {
    return {
      name: settings.oidcProviderName || 'Custom OIDC Provider',
      discoveryUrl: settings.oidcDiscoveryUrl,
      clientId: settings.oidcClientId,
      clientSecret: settings.oidcClientSecret || '',
      authorizationEndpoint: settings.oidcAuthorizationEndpoint,
      tokenEndpoint: settings.oidcTokenEndpoint,
      userinfoEndpoint: settings.oidcUserinfoEndpoint,
    }
  }
  
  // Otherwise, try to fetch from discovery document
  // This will be handled by the provider-details endpoint
  const baseUrl = settings.oidcDiscoveryUrl
    .replace(/\/$/, '')
    .replace('/.well-known/openid-configuration', '')
  
  return {
    name: settings.oidcProviderName || 'Custom OIDC Provider',
    discoveryUrl: settings.oidcDiscoveryUrl,
    clientId: settings.oidcClientId,
    clientSecret: settings.oidcClientSecret || '',
    authorizationEndpoint: settings.oidcAuthorizationEndpoint || `${baseUrl}/authorize/`,
    tokenEndpoint: settings.oidcTokenEndpoint || `${baseUrl}/token/`,
    userinfoEndpoint: settings.oidcUserinfoEndpoint || `${baseUrl}/userinfo/`,
  }
}
