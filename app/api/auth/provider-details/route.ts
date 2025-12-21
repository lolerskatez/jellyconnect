import { NextRequest, NextResponse } from 'next/server'
import { getAuthSettings } from '@/app/lib/auth-settings'

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
    console.log('[PROVIDER-DETAILS] Fetching from discovery URL:', settings.oidcDiscoveryUrl)
    const discoveryResponse = await fetch(settings.oidcDiscoveryUrl)
    
    if (!discoveryResponse.ok) {
      console.error('[PROVIDER-DETAILS] Failed to fetch discovery document:', discoveryResponse.status)
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
    console.error('[PROVIDER-DETAILS] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch provider details' }, { status: 500 })
  }
}

