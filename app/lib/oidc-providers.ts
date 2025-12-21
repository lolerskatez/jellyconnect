// Generic OIDC provider using discovery URL
export function createCustomOIDCProvider(config: {
  name: string
  discoveryUrl: string
  clientId: string
  clientSecret: string
}): any {
  // Build the wellKnown URL if it's not already complete
  let wellKnownUrl = config.discoveryUrl
  if (!wellKnownUrl.includes('/.well-known/openid-configuration')) {
    // Remove trailing slash if present
    wellKnownUrl = wellKnownUrl.replace(/\/$/, '')
    wellKnownUrl = `${wellKnownUrl}/.well-known/openid-configuration`
  }

  // Extract issuer from discovery URL
  const issuer = config.discoveryUrl.replace(/\/$/, '').replace('/.well-known/openid-configuration', '')

  console.log('[OIDC] Creating provider with issuer:', issuer)
  console.log('[OIDC] Client ID:', config.clientId)
  console.log('[OIDC] Using wellKnown URL:', wellKnownUrl)

  // Create OAuth provider with explicit OIDC endpoints for NextAuth v4
  const provider: any = {
    id: 'authentik',
    name: config.name,
    type: 'oauth',
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: {
      url: 'https://auth.tanjiro.one/application/o/authorize/',
      params: {
        scope: 'openid profile email',
      },
    },
    token: 'https://auth.tanjiro.one/application/o/token/',
    userinfo: 'https://auth.tanjiro.one/application/o/userinfo/',
    profile(profile: any) {
      console.log('[OIDC] Profile received:', profile)
      return {
        id: profile.sub,
        name: profile.name || profile.preferred_username || 'User',
        email: profile.email,
      }
    },
  }

  return provider
}



// Get enabled providers based on database configuration
export function getEnabledProviders() {
  const providers: any[] = []

  // Check for custom OIDC configuration from database
  try {
    // Import dynamically to avoid circular dependencies
    const { getOIDCProviderConfig } = require('./auth-settings')
    const providerConfig = getOIDCProviderConfig()

    if (providerConfig && providerConfig.discoveryUrl && providerConfig.clientId) {
      console.log('[OIDC] Loading custom provider from database:', providerConfig.name)
      providers.push(createCustomOIDCProvider(providerConfig))
    }
  } catch (error) {
    console.log('[OIDC] No custom OIDC provider configured in database:', error instanceof Error ? error.message : 'Unknown error')
  }

  return providers
}

