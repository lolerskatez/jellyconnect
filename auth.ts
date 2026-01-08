import NextAuth, { type NextAuthOptions } from "next-auth"
import { DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getEnabledProviders } from "./app/lib/oidc-providers"
import { database } from "./app/lib/db"
import { generateSecurePassword, generateSecureUsername } from "./app/lib/secure-password"
import { mapGroupsToRole } from "./app/lib/oidc-group-mapping"
import { authLogger } from "./app/lib/logger"
import { encrypt } from "./app/lib/encryption"
import { getAppUrl } from "./app/lib/auth-settings"

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string
      jellyfinId?: string
      email?: string
      oidcProvider?: string
    } & DefaultSession["user"]
  }
}

async function autoCreateJellyfinUser(
  email: string,
  name: string,
  oidcProvider: string,
  groups?: string[]
): Promise<typeof database.users[0] | null | undefined> {
  try {
    const existingUser = database.users.find(u => u.email === email)
    if (existingUser) {
      authLogger.info('User already exists, skipping creation', { email })
      return existingUser
    }

    const config = (await import('./app/lib/config')).getConfig()
    if (!config.jellyfinUrl || !config.apiKey) {
      authLogger.error('Jellyfin not configured, cannot auto-create user', { jellyfinUrl: !!config.jellyfinUrl, apiKey: !!config.apiKey })
      return null
    }

    // Map OIDC groups to Jellyfin role
    const role = mapGroupsToRole(groups)
    authLogger.info('Creating new Jellyfin user', { email, role, groups })

    // Generate a secure username and password
    const jellyfinUsername = generateSecureUsername(email)
    const securePassword = generateSecurePassword()

    // Create user with secure password
    const jellyfinRes = await fetch(`${config.jellyfinUrl}/Users/New`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': config.apiKey,
      },
      body: JSON.stringify({ 
        Name: jellyfinUsername,
        Password: securePassword
      }),
    })

    if (!jellyfinRes.ok) {
      authLogger.error('Failed to create Jellyfin user', { status: jellyfinRes.status, statusText: jellyfinRes.statusText, email })
      return null
    }

    const createdUser = await jellyfinRes.json()
    const jellyfin_id: string = createdUser.Id || null
    if (!jellyfin_id) {
      authLogger.error('No user ID returned from Jellyfin', { email, createdUser })
      return null
    }

    // Apply the role-based policy
    const { getRolePolicyForJellyfin } = await import('./app/lib/oidc-group-mapping')
    const policy = getRolePolicyForJellyfin(role)

    const policyRes = await fetch(`${config.jellyfinUrl}/Users/${jellyfin_id}/Policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': config.apiKey,
      },
      body: JSON.stringify(policy),
    })

    if (!policyRes.ok) {
      authLogger.error('Failed to apply policy to user', { status: policyRes.status, statusText: policyRes.statusText, userId: jellyfin_id, role })
      // Continue anyway - user is created, but without proper policy
    }

    const newUser: typeof database.users[0] = {
      id: jellyfin_id,
      jellyfinId: jellyfin_id,
      jellyfinUsername,
      jellyfinPasswordEncrypted: encrypt(securePassword),
      displayName: name || jellyfinUsername,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      oidcProvider,
      oidcProviderId: email,
      oidcGroups: groups || [],
    }

    database.users.push(newUser)
    
    // Save database immediately so new user persists
    const { saveDatabaseImmediate } = await import('./app/lib/db')
    saveDatabaseImmediate()
    
    authLogger.info('User created successfully', {
      email,
      jellyfinId: jellyfin_id,
      jellyfinUsername,
      displayName: name || jellyfinUsername,
      role,
      groups
    })
    return newUser
  } catch (error) {
    authLogger.error('Auto-create failed', { error: error instanceof Error ? error.message : String(error), email })
    return null
  }
}

const enabledProviders = getEnabledProviders()

if (typeof window === 'undefined') {
  authLogger.info('Enabled providers', {
    count: enabledProviders.length,
    providers: enabledProviders.map((p: any) => p.id)
  })
  authLogger.debug('Provider details', {
    providers: enabledProviders.map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type,
    }))
  })
}

const allProviders = [
  ...enabledProviders,
  ...(enabledProviders.length === 0 ? [
    CredentialsProvider({
      id: 'fallback-credentials',
      name: 'Default',
      credentials: {},
      async authorize() {
        return null
      }
    })
  ] : [])
]

if (typeof window === 'undefined') {
  authLogger.info('All providers configured', { count: allProviders.length })
}
const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production' || getAppUrl().startsWith('https'),
      },
    },
  },
  logger: {
    error(code, metadata) {
      authLogger.error('NextAuth error', { code, metadata })
    },
    warn(code) {
      authLogger.warn('NextAuth warning', { code })
    },
    debug(code, metadata) {
      authLogger.debug('NextAuth debug', { code, metadata })
    }
  },
  providers: allProviders,
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (!account || !profile) return false

      authLogger.info('Sign in attempt', { email: profile.email, provider: account.provider })
      authLogger.debug('Full profile object', { profile: JSON.stringify(profile, null, 2) })

      let dbUser: typeof database.users[0] | null | undefined = database.users.find(u => u.email === profile.email)

      if (!dbUser) {
        authLogger.info('User not found, attempting auto-create', { email: profile.email })

        // Extract groups from OIDC profile
        // Different providers use different claim names for groups:
        // - 'groups' (common)
        // - 'roles' (some providers)
        // - 'oidc_groups' (custom)
        const groups = profile.groups || profile.roles || profile.oidc_groups || []
        authLogger.info('OIDC groups extracted', { 
          email: profile.email, 
          groups, 
          groupsType: Array.isArray(groups) ? 'array' : typeof groups,
          profileGroups: profile.groups,
          profileRoles: profile.roles,
          profileOidcGroups: profile.oidc_groups
        })

        // Map groups to role and log the result
        const mappedRole = mapGroupsToRole(Array.isArray(groups) ? groups : [groups])
        authLogger.info('OIDC role mapping result', { 
          email: profile.email, 
          groups, 
          mappedRole 
        })

        dbUser = await autoCreateJellyfinUser(
          profile.email || '',
          profile.name || '',
          account.provider,
          Array.isArray(groups) ? groups : [groups]
        )

        if (!dbUser) {
          authLogger.error('Failed to auto-create user', { email: profile.email })
          return false
        }
      } else {
        // Update existing user's groups and display name if they've changed
        const newGroups = profile.groups || profile.roles || profile.oidc_groups || []
        if (newGroups && Array.isArray(newGroups)) {
          dbUser.oidcGroups = newGroups
          authLogger.info('Updated groups for existing user', { email: profile.email, groups: newGroups })
        }

        // Update display name if provided
        if (profile.name && profile.name !== dbUser.displayName) {
          dbUser.displayName = profile.name
          authLogger.info('Updated display name for existing user', { email: profile.email, newName: profile.name })
        }

        dbUser.updatedAt = new Date().toISOString()
      }

      if (dbUser) {
        dbUser.oidcProvider = account.provider
        dbUser.oidcProviderId = profile.email || ''

        // Save database immediately so changes persist
        const { saveDatabaseImmediate } = await import('./app/lib/db')
        saveDatabaseImmediate()
      }

      return true
    },
    async jwt({ token, user, account, profile }: any) {
      if (user) {
        token.jellyfinId = (user as any).jellyfinId
        token.oidcProvider = account?.provider || 'authentik'
      }

      if (account && profile) {
        const dbUser = database.users.find(u => u.email === profile.email)
        if (dbUser) {
          token.jellyfinId = dbUser.id
          token.oidcProvider = account.provider
        }
      }

      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub || ""
        session.user.jellyfinId = token.jellyfinId || ""
        session.user.oidcProvider = token.oidcProvider
      }
      return session
    },
  },
}

export { authOptions }
const handler = NextAuth(authOptions)

// Export as both GET and POST handlers
export const handlers = {
  GET: handler,
  POST: handler
}

export const auth = handler.auth
export const signIn = handler.signIn  
export const signOut = handler.signOut

if (typeof window === 'undefined') {
  authLogger.info('NextAuth configured', { providerCount: allProviders.length })
}
