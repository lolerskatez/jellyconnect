import NextAuth, { type NextAuthOptions } from "next-auth"
import { DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getEnabledProviders } from "./app/lib/oidc-providers"
import { database } from "./app/lib/db"

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
  oidcProvider: string
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

    console.log('[OIDC] Creating new Jellyfin user:', email)
    const jellyfinRes = await fetch(`${config.jellyfinUrl}/Users/New`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': config.apiKey,
      },
      body: JSON.stringify({ Name: name || email.split('@')[0] }),
    })

    if (!jellyfinRes.ok) {
      console.error('[OIDC] Failed to create Jellyfin user:', jellyfinRes.statusText)
      return null
    }

    const jellyfin_id: string = (await jellyfinRes.json()).Id || null
    if (!jellyfin_id) {
      console.error('[OIDC] No user ID returned from Jellyfin')
      return null
    }

    const newUser: typeof database.users[0] = {
      id: jellyfin_id,
      jellyfinId: jellyfin_id,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      oidcProvider,
      oidcProviderId: email,
    }

    database.users.push(newUser)
    console.log('[OIDC] User created and added to database:', email, jellyfin_id)
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
        dbUser = await autoCreateJellyfinUser(
          profile.email || '',
          profile.name || '',
          account.provider
        )

        if (!dbUser) {
          console.error('[OIDC] Failed to auto-create user')
          return false
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
