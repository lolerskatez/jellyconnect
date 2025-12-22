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
    console.log('[AUTH-SETTINGS] Fetching discovery document from:', settings.oidcDiscoveryUrl)
    const discoveryResponse = await fetch(settings.oidcDiscoveryUrl)
    
    if (!discoveryResponse.ok) {
      console.error('[AUTH-SETTINGS] Failed to fetch discovery document:', discoveryResponse.status)
      throw new Error('Failed to fetch OIDC discovery document')
    }
    
    const discovery = await discoveryResponse.json()
    console.log('[AUTH-SETTINGS] Discovery endpoints:', {
      authorization: discovery.authorization_endpoint,
      token: discovery.token_endpoint,
      userinfo: discovery.userinfo_endpoint,
    })
    
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
    console.error('[AUTH-SETTINGS] Error fetching discovery document:', error)
    return null
  }
}
