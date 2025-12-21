import NextAuth, { type NextAuthOptions } from "next-auth"
import { DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getEnabledProviders } from "./app/lib/oidc-providers"
import { database } from "./app/lib/db"
import { generateSecurePassword, generateSecureUsername } from "./app/lib/secure-password"
import { mapGroupsToRole } from "./app/lib/oidc-group-mapping"

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
      console.log('[OIDC] User already exists:', email)
      return existingUser
    }

    const config = (await import('./app/lib/config')).getConfig()
    if (!config.jellyfinUrl || !config.apiKey) {
      console.error('[OIDC] Jellyfin not configured, cannot auto-create user')
      return null
    }

    // Map OIDC groups to Jellyfin role
    const role = mapGroupsToRole(groups)
    console.log('[OIDC] Creating new Jellyfin user:', email, 'with role:', role, 'from groups:', groups)

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
      console.error('[OIDC] Failed to create Jellyfin user:', jellyfinRes.statusText)
      return null
    }

    const createdUser = await jellyfinRes.json()
    const jellyfin_id: string = createdUser.Id || null
    if (!jellyfin_id) {
      console.error('[OIDC] No user ID returned from Jellyfin')
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
      console.error('[OIDC] Failed to apply policy to user:', policyRes.statusText)
      // Continue anyway - user is created, but without proper policy
    }

    const newUser: typeof database.users[0] = {
      id: jellyfin_id,
      jellyfinId: jellyfin_id,
      jellyfinUsername,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      oidcProvider,
      oidcProviderId: email,
      oidcGroups: groups || [],
    }

    database.users.push(newUser)
    console.log('[OIDC] User created successfully:', {
      email,
      jellyfinId: jellyfin_id,
      jellyfinUsername,
      role,
      groups
    })
    return newUser
  } catch (error) {
    console.error('[OIDC] Auto-create failed:', error)
    return null
  }
}

const enabledProviders = getEnabledProviders()

if (typeof window === 'undefined') {
  console.log('[AUTH] Enabled providers:', enabledProviders.length, enabledProviders.map((p: any) => p.id))
  console.log('[AUTH] Provider details:', enabledProviders.map((p: any) => ({
    id: p.id,
    name: p.name,
    type: p.type,
  })))
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
  console.log('[AUTH] All providers (including fallback):', allProviders.length)
}
const authOptions: NextAuthOptions = {
  debug: true,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata)
    },
    warn(code) {
      console.warn('[NextAuth Warn]', code)
    },
    debug(code, metadata) {
      console.log('[NextAuth Debug]', code, metadata)
    }
  },
  providers: allProviders,
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (!account || !profile) return false

      console.log('[OIDC] Sign in attempt:', profile.email, 'provider:', account.provider)

      let dbUser: typeof database.users[0] | null | undefined = database.users.find(u => u.email === profile.email)

      if (!dbUser) {
        console.log('[OIDC] User not found, attempting auto-create')
        
        // Extract groups from OIDC profile
        // Different providers use different claim names for groups:
        // - 'groups' (common)
        // - 'roles' (some providers)
        // - 'oidc_groups' (custom)
        const groups = profile.groups || profile.roles || profile.oidc_groups || []
        
        dbUser = await autoCreateJellyfinUser(
          profile.email || '',
          profile.name || '',
          account.provider,
          Array.isArray(groups) ? groups : [groups]
        )

        if (!dbUser) {
          console.error('[OIDC] Failed to auto-create user')
          return false
        }
      } else {
        // Update existing user's groups if they've changed
        const newGroups = profile.groups || profile.roles || profile.oidc_groups || []
        if (newGroups && Array.isArray(newGroups)) {
          dbUser.oidcGroups = newGroups
          console.log('[OIDC] Updated groups for existing user:', profile.email, newGroups)
        }
      }

      if (dbUser) {
        dbUser.oidcProvider = account.provider
        dbUser.oidcProviderId = profile.email || ''
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

// For NextAuth v4 with App Router, create handlers manually
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
  console.log('[AUTH] NextAuth configured with', allProviders.length, 'providers')
}
