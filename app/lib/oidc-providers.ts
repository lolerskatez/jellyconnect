// Generic OIDC provider using discovery URL and endpoints
import { authLogger } from './logger';
import { getAppUrl } from './auth-settings';

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

  authLogger.info('Creating OIDC provider', {
    name: config.name,
    clientId: config.clientId,
    wellKnownUrl,
    endpoints: {
      authorization: config.authorizationEndpoint || 'from discovery',
      token: config.tokenEndpoint || 'from discovery',
      userinfo: config.userinfoEndpoint || 'from discovery',
    }
  })

  // Create OAuth provider 
  const provider: any = {
    id: 'oidc',
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
    token: {
      clientSecret: config.clientSecret,
      params: {},
    },
    redirectUri: `${getAppUrl()}/api/auth/callback/oidc`,
    profile(profile: any) {
      authLogger.debug('OIDC profile received', { sub: profile.sub, email: profile.email, name: profile.name })
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
      authLogger.info('Loading custom OIDC provider from database', { name: providerConfig.name })
      providers.push(createCustomOIDCProvider(providerConfig))
    }
  } catch (error) {
    authLogger.info('No custom OIDC provider configured in database', { error: error instanceof Error ? error.message : 'Unknown error' })
  }

  return providers
}

