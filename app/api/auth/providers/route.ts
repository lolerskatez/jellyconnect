import { NextRequest, NextResponse } from 'next/server'
import { getAuthSettings, getOIDCProviderConfig } from '@/app/lib/auth-settings'
import { getEnabledProviders } from '@/app/lib/oidc-providers'

export async function GET(request: NextRequest) {
  try {
    const authSettings = getAuthSettings()
    const enabledProviders = getEnabledProviders()
    
    // Build response with enabled auth methods
    const response: any = {
      oidcEnabled: authSettings.oidcEnabled,
      passwordAuthEnabled: authSettings.passwordAuthEnabled,
      forceOIDC: authSettings.forceOIDC,
      enabledProviders: enabledProviders.map((p: any) => p.id),
    }
    
    // Include provider names if configured
    if (enabledProviders.length > 0) {
      response.providers = enabledProviders.map((p: any) => ({
        id: p.id,
        name: p.name
      }))
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching auth providers:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}
