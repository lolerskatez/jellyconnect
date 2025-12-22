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
  
  // Always return what we have in settings - endpoints will be fetched dynamically when needed
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

export async function getOIDCProviderConfigWithEndpoints() {
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
  
  // Otherwise, fetch from discovery document
  try {
    const discoveryResponse = await fetch(settings.oidcDiscoveryUrl)
    
    if (!discoveryResponse.ok) {
      console.error('Failed to fetch OIDC discovery document:', discoveryResponse.status)
      throw new Error('Failed to fetch OIDC discovery document')
    }
    
    const discovery = await discoveryResponse.json()
    
    return {
      name: settings.oidcProviderName || 'Custom OIDC Provider',
      discoveryUrl: settings.oidcDiscoveryUrl,
      clientId: settings.oidcClientId,
      clientSecret: settings.oidcClientSecret || '',
      authorizationEndpoint: discovery.authorization_endpoint,
      tokenEndpoint: discovery.token_endpoint,
      userinfoEndpoint: discovery.userinfo_endpoint,
    }
  } catch (error) {
    console.error('Error fetching OIDC discovery document:', error)
    return null
  }
}
