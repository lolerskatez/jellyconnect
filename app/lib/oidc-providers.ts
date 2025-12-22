// Generic OIDC provider using discovery URL and endpoints
export function createCustomOIDCProvider(config: {
  name: string
  discoveryUrl: string
  clientId: string
  clientSecret: string
  authorizationEndpoint?: string
  tokenEndpoint?: string
  userinfoEndpoint?: string
}): any {
  // Build the wellKnown URL if it's not already complete
  let wellKnownUrl = config.discoveryUrl
  if (!wellKnownUrl.includes('/.well-known/openid-configuration')) {
    // Remove trailing slash if present
    wellKnownUrl = wellKnownUrl.replace(/\/$/, '')
    wellKnownUrl = `${wellKnownUrl}/.well-known/openid-configuration`
  }

  console.log('[OIDC] Creating provider with name:', config.name)
  console.log('[OIDC] Client ID:', config.clientId)
  console.log('[OIDC] WellKnown URL:', wellKnownUrl)
  console.log('[OIDC] Endpoints:', {
    authorization: config.authorizationEndpoint || 'from discovery',
    token: config.tokenEndpoint || 'from discovery',
    userinfo: config.userinfoEndpoint || 'from discovery',
  })

  // Create OAuth provider 
  const provider: any = {
    id: 'authentik',
    name: config.name,
    type: 'oauth',
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    wellKnown: wellKnownUrl, // Let NextAuth fetch endpoints from discovery
    authorization: {
      params: {
        scope: 'openid profile email',
      },
    },
    profile(profile: any) {
      console.log('[OIDC] Profile received:', profile)
      return {
        id: profile.sub,
        name: profile.name || profile.preferred_username || 'User',
        email: profile.email,
      }
    },
  }

  // If endpoints are explicitly provided, use them (overrides wellKnown)
  if (config.authorizationEndpoint && config.tokenEndpoint && config.userinfoEndpoint) {
    provider.authorization.url = config.authorizationEndpoint
    provider.token = config.tokenEndpoint
    provider.userinfo = config.userinfoEndpoint
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

