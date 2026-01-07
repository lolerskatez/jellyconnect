import { NextRequest, NextResponse } from 'next/server'
import { getAuthSettings } from '@/app/lib/auth-settings'
import { authLogger } from '@/app/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const settings = getAuthSettings()
    
    if (!settings.oidcEnabled || !settings.oidcDiscoveryUrl) {
      return NextResponse.json({ error: 'OIDC not configured' }, { status: 404 })
    }
    
    // If endpoints are explicitly configured, use those
    if (settings.oidcAuthorizationEndpoint && settings.oidcTokenEndpoint && settings.oidcUserinfoEndpoint) {
      return NextResponse.json({
        name: settings.oidcProviderName || 'OIDC Provider',
        clientId: settings.oidcClientId,
        authorizationEndpoint: settings.oidcAuthorizationEndpoint,
        tokenEndpoint: settings.oidcTokenEndpoint,
        userinfoEndpoint: settings.oidcUserinfoEndpoint,
        discoveryUrl: settings.oidcDiscoveryUrl,
      })
    }
    
    // Otherwise, fetch from discovery URL
    authLogger.info('Fetching OIDC discovery document', { discoveryUrl: settings.oidcDiscoveryUrl })
    const discoveryResponse = await fetch(settings.oidcDiscoveryUrl)
    
    if (!discoveryResponse.ok) {
      authLogger.error('Failed to fetch OIDC discovery document', { status: discoveryResponse.status, discoveryUrl: settings.oidcDiscoveryUrl })
      return NextResponse.json({ error: 'Failed to fetch provider discovery' }, { status: 500 })
    }
    
    const discovery = await discoveryResponse.json()
    
    return NextResponse.json({
      name: settings.oidcProviderName || 'OIDC Provider',
      clientId: settings.oidcClientId,
      authorizationEndpoint: discovery.authorization_endpoint,
      tokenEndpoint: discovery.token_endpoint,
      userinfoEndpoint: discovery.userinfo_endpoint,
      discoveryUrl: settings.oidcDiscoveryUrl,
    })
  } catch (error) {
    authLogger.error('Error fetching provider details', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch provider details' }, { status: 500 })
  }
}

