import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'
import { apiRateLimit } from '@/app/lib/rate-limit'

async function getStatusHandler() {
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

export async function GET(request: NextRequest) {
  return apiRateLimit(request, () => getStatusHandler());
}