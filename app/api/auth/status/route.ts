import { NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'

export async function GET() {
  const config = getConfig()

  // Check if OIDC is properly configured (not placeholder values)
  const isOidcConfigured = !!(
    config.oidcIssuer &&
    config.oidcClientId &&
    config.oidcClientSecret &&
    config.nextAuthSecret &&
    !config.oidcIssuer.includes('placeholder') &&
    !config.oidcClientId.includes('placeholder') &&
    !config.oidcClientSecret.includes('placeholder')
  )

  return NextResponse.json({ isOidcConfigured })
}