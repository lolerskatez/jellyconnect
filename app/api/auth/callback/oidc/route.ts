import { NextRequest, NextResponse } from 'next/server'
import { database, saveDatabaseImmediate } from '@/app/lib/db'
import { getOIDCProviderConfigWithEndpoints } from '@/app/lib/auth-settings'
import { generateSecurePassword, generateSecureUsername } from '@/app/lib/secure-password'
import { mapGroupsToRole, getRolePolicyForJellyfin } from '@/app/lib/oidc-group-mapping'
import { encrypt } from '@/app/lib/encryption'
import { authLogger } from '@/app/lib/logger'

// Get the base URL for redirects - derive from request to support both admin and public servers
function getBaseUrl(req: NextRequest): string {
  // Priority 1: Check if appUrl is configured in settings
  try {
    const { getAuthSettings } = require('@/app/lib/auth-settings')
    const settings = getAuthSettings()
    if (settings.appUrl) {
      authLogger.info('Using appUrl from settings for OIDC callback', { appUrl: settings.appUrl })
      return settings.appUrl
    }
  } catch (e) {
    authLogger.warn('Could not load appUrl from settings', { error: e instanceof Error ? e.message : 'Unknown error' })
  }
  
  // Priority 2: Use environment variable (most reliable for production)
  const envUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_NEXTAUTH_URL
  if (envUrl) {
    authLogger.info('Using NEXTAUTH_URL from environment for OIDC callback', { envUrl })
    return envUrl
  }
  
  // Priority 3: Get from request headers (handles proxied requests with proper headers)
  const forwardedHost = req.headers.get('x-forwarded-host')
  const forwardedProto = req.headers.get('x-forwarded-proto')
  
  if (forwardedProto && forwardedHost) {
    authLogger.info('Using forwarded headers for OIDC callback base URL', { url: `${forwardedProto}://${forwardedHost}` })
    return `${forwardedProto}://${forwardedHost}`
  }
  
  // Priority 4: Get from host header with assumed https for non-localhost
  const host = req.headers.get('host')
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    const url = `https://${host}`
    authLogger.info('Using host header with HTTPS for OIDC callback base URL', { url })
    return url
  }
  
  // Fallback for local development
  return 'http://localhost:3100'
}

/**
 * Generic OIDC callback handler
 * Works with any configured OIDC provider (Authentik, Keycloak, etc.)
 * Receives the authorization code and exchanges it for tokens
 */
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    authLogger.info('OIDC callback received', { codePrefix: code?.substring(0, 20), state, error })
    authLogger.info('Using base URL for redirects', { baseUrl })

    // Check for errors from provider
    if (error) {
      const errorMsg = errorDescription || error
      authLogger.error('OIDC provider error', { error: errorMsg })
      return NextResponse.redirect(
        new URL(`/login?error=oidc_error&message=${encodeURIComponent(errorMsg.substring(0, 100))}`, baseUrl)
      )
    }

    if (!code) {
      authLogger.error('No authorization code received')
      return NextResponse.redirect(new URL('/login?error=no_code', baseUrl))
    }

    if (!state) {
      authLogger.error('No state received')
      return NextResponse.redirect(new URL('/login?error=no_state', baseUrl))
    }

    // Get provider configuration from database
    const providerConfig = await getOIDCProviderConfigWithEndpoints()
    if (!providerConfig) {
      authLogger.error('No OIDC provider configured')
      return NextResponse.redirect(new URL('/login?error=provider_not_configured', baseUrl))
    }

    authLogger.info('Using OIDC provider', { provider: providerConfig.name })

    // Build redirect URI using the same baseUrl - must match what was sent to the provider
    const redirectUri = `${baseUrl}/api/auth/callback/oidc`

    authLogger.info('Exchanging code for tokens', {
      provider: providerConfig.name,
      clientId: providerConfig.clientId,
      redirectUri,
    })

    // Exchange authorization code for tokens
    const tokenEndpoint = providerConfig.tokenEndpoint
    authLogger.info('Token endpoint being used', { tokenEndpoint })
    
    // Use Basic Authentication for client credentials (more reliable with Authentik)
    const basicAuth = Buffer.from(`${providerConfig.clientId}:${providerConfig.clientSecret}`).toString('base64')
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      authLogger.error('Token exchange failed', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        endpoint: tokenEndpoint,
        error: errorText,
      })
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange_failed&message=${encodeURIComponent(tokenResponse.statusText || 'Unknown error')}`, baseUrl)
      )
    }

    const tokens = await tokenResponse.json()
    authLogger.info('Tokens received', {
      accessTokenPrefix: tokens.access_token?.substring(0, 20),
      idTokenPrefix: tokens.id_token?.substring(0, 20),
      expiresIn: tokens.expires_in,
    })

    // Fetch user information
    const userinfoEndpoint = providerConfig.userinfoEndpoint
    
    authLogger.info('Fetching user info from endpoint', { userinfoEndpoint })
    
    const userinfoResponse = await fetch(userinfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userinfoResponse.ok) {
      const error = await userinfoResponse.text()
      authLogger.error('Userinfo request failed', { status: userinfoResponse.status, error })
      return NextResponse.redirect(
        new URL(`/login?error=userinfo_failed&message=${encodeURIComponent(error.substring(0, 100))}`, baseUrl)
      )
    }

    const userinfo = await userinfoResponse.json()
    authLogger.info('User info received', {
      sub: userinfo.sub,
      email: userinfo.email,
      name: userinfo.name || userinfo.preferred_username,
      groups: userinfo.groups,
      roles: userinfo.roles,
      oidc_groups: userinfo.oidc_groups,
      all_claims: Object.keys(userinfo),
    })
    
    // Log the complete userinfo for debugging
    authLogger.debug('Complete OIDC userinfo', {
      userinfo: JSON.stringify(userinfo, null, 2)
    })

    if (!userinfo.email) {
      authLogger.error('No email in user info')
      return NextResponse.redirect(new URL('/login?error=no_email', baseUrl))
    }

    // Check if user exists
    let user = database.users.find(u => u.email === userinfo.email)

    if (!user) {
      // Auto-create user in Jellyfin with enhanced features
      authLogger.info('Creating new user', { email: userinfo.email })
      const { getConfig } = await import('@/app/lib/config')
      const config = getConfig()
      
      if (!config.jellyfinUrl || !config.apiKey) {
        authLogger.error('Jellyfin not configured')
        return NextResponse.redirect(new URL('/login?error=jellyfin_not_configured', baseUrl))
      }

      // Extract groups from OIDC userinfo
      // Different providers use different claim names for groups:
      // - 'groups' (common)
      // - 'roles' (some providers)
      // - 'oidc_groups' (custom)
      const groups = userinfo.groups || userinfo.roles || userinfo.oidc_groups || []
      const groupsArray = Array.isArray(groups) ? groups : [groups]
      
      authLogger.info('Groups extracted from OIDC userinfo', {
        email: userinfo.email,
        rawGroups: groups,
        groupsArray,
        hasGroups: groupsArray.length > 0
      })
      
      // Map OIDC groups to Jellyfin role BEFORE creating user
      const role = mapGroupsToRole(groupsArray)
      authLogger.info('Mapped role from groups', { 
        email: userinfo.email,
        role, 
        groups: groupsArray,
        roleIsNull: role === null
      })

      // Check if user is authorized based on group mappings
      if (role === null) {
        authLogger.warn('Access denied: User does not belong to any configured groups', {
          email: userinfo.email,
          groups: groupsArray
        })
        return NextResponse.redirect(
          new URL('/login?error=AccessDenied', baseUrl)
        )
      }

      // Use SSO provider's username (preferred_username or name), fallback to email prefix
      const jellyfinUsername = userinfo.preferred_username || userinfo.name || userinfo.email.split('@')[0]
      const securePassword = generateSecurePassword()

      authLogger.info('Creating Jellyfin user', { jellyfinUsername, role, email: userinfo.email })

      let userId: string | null = null
      let jellyfinUser: any = null

      const createUserResponse = await fetch(`${config.jellyfinUrl}/Users/New`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Token': config.apiKey,
        },
        body: JSON.stringify({
          Name: jellyfinUsername,
          Password: securePassword,
        }),
      })

      if (!createUserResponse.ok) {
        const error = await createUserResponse.text()
        authLogger.warn('User creation returned error, checking for existing user', { status: createUserResponse.status, error })
        
        // If user creation failed, try to find existing user with this username
        authLogger.info('Checking if user already exists in Jellyfin')
        try {
          const usersResponse = await fetch(`${config.jellyfinUrl}/Users`, {
            headers: {
              'X-Emby-Token': config.apiKey,
            },
          })
          
          if (usersResponse.ok) {
            const allUsers = await usersResponse.json()
            const existingUser = allUsers.find((u: any) => 
              u.Name?.toLowerCase() === jellyfinUsername.toLowerCase()
            )
            
            if (existingUser) {
              authLogger.info('Found existing Jellyfin user', { name: existingUser.Name, id: existingUser.Id })
              userId = existingUser.Id
              jellyfinUser = existingUser
            }
          }
        } catch (findError) {
          authLogger.error('Error finding existing user', { error: findError instanceof Error ? findError.message : 'Unknown error' })
        }
        
        if (!userId) {
          authLogger.error('Failed to create or find Jellyfin user')
          return NextResponse.redirect(new URL('/login?error=user_creation_failed', baseUrl))
        }
      } else {
        jellyfinUser = await createUserResponse.json()
        userId = jellyfinUser.Id
      }

      if (!userId) {
        authLogger.error('No user ID returned from Jellyfin')
        return NextResponse.redirect(new URL('/login?error=invalid_user_response', baseUrl))
      }

      // Get the user's current policy first (to preserve required fields like auth provider IDs)
      let currentPolicy: any = {}
      try {
        const currentUserResponse = await fetch(`${config.jellyfinUrl}/Users/${userId}`, {
          headers: {
            'X-Emby-Token': config.apiKey,
          },
        })
        if (currentUserResponse.ok) {
          const currentUser = await currentUserResponse.json()
          currentPolicy = currentUser.Policy || {}
          authLogger.info('Got current user policy from Jellyfin', { 
            authProviderId: currentPolicy.AuthenticationProviderId,
            isAdministrator: currentPolicy.IsAdministrator,
            userId
          })
        }
      } catch (error) {
        authLogger.error('Failed to get current user policy', { error: error instanceof Error ? error.message : 'Unknown error' })
      }

      // Apply the role-based policy merged with required fields from current policy
      const rolePolicy = getRolePolicyForJellyfin(role)
      const policy = {
        ...rolePolicy,
        // Preserve the auth provider IDs from Jellyfin (required fields)
        AuthenticationProviderId: currentPolicy.AuthenticationProviderId || 'Jellyfin.Server.Implementations.Users.DefaultAuthenticationProvider',
        PasswordResetProviderId: currentPolicy.PasswordResetProviderId || 'Jellyfin.Server.Implementations.Users.DefaultPasswordResetProvider',
      }
      
      authLogger.info('Applying role policy to new user', {
        userId,
        role,
        isAdministrator: policy.IsAdministrator,
        enableContentDeletion: policy.EnableContentDeletion,
        authProviderId: policy.AuthenticationProviderId,
        policyKeys: Object.keys(policy).length
      })
      
      const policyResponse = await fetch(`${config.jellyfinUrl}/Users/${userId}/Policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Token': config.apiKey,
        },
        body: JSON.stringify(policy),
      })

      if (!policyResponse.ok) {
        const errorText = await policyResponse.text()
        authLogger.error('Failed to apply policy to user', {
          status: policyResponse.status,
          error: errorText
        })
        // Continue anyway - user is created, but log the policy application failure
      } else {
        authLogger.info('Policy applied successfully to new user', { role })
        
        // Verify policy was applied correctly by reading it back
        try {
          const verifyResponse = await fetch(`${config.jellyfinUrl}/Users/${userId}`, {
            headers: {
              'X-Emby-Token': config.apiKey,
            },
          })
          if (verifyResponse.ok) {
            const verifyUser = await verifyResponse.json()
            authLogger.info('VERIFICATION: Jellyfin user policy after application', {
              userId,
              expectedRole: role,
              actualIsAdministrator: verifyUser.Policy?.IsAdministrator,
              actualEnableContentDeletion: verifyUser.Policy?.EnableContentDeletion,
            })
          }
        } catch (e) {
          authLogger.warn('Could not verify policy application', { error: e instanceof Error ? e.message : 'Unknown error' })
        }
      }

      const newUser = {
        id: userId,
        jellyfinId: userId,
        jellyfinUsername,
        displayName: userinfo.name || userinfo.preferred_username || jellyfinUsername,
        email: userinfo.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        oidcProvider: providerConfig.name,
        oidcProviderId: userinfo.sub,
        oidcGroups: groupsArray,
        // Store encrypted Jellyfin password for QuickConnect authorization
        jellyfinPasswordEncrypted: encrypt(securePassword),
      } as any

      database.users.push(newUser)
      saveDatabaseImmediate()  // Persist immediately to ensure QuickConnect works
      user = newUser
      authLogger.info('User created successfully', {
        email: newUser.email,
        jellyfinId: userId,
        jellyfinUsername,
        displayName: newUser.displayName,
        role,
        groups: groupsArray
      })
    } else {
      authLogger.info('Existing user found', { email: user.email })
      // Update OIDC provider info and groups
      user.oidcProvider = providerConfig.name
      user.oidcProviderId = userinfo.sub
      user.updatedAt = new Date().toISOString()
      
      // Migrate legacy users (add username if missing)
      if (!user.jellyfinUsername) {
        user.jellyfinUsername = generateSecureUsername(user.email || 'user')
        authLogger.info('Migrated legacy user - generated username', { jellyfinUsername: user.jellyfinUsername })
      }
      
      // Ensure user exists in Jellyfin (in case of sync issues)
      try {
        const { getConfig } = await import('@/app/lib/config')
        const config = getConfig()
        
        if (config.jellyfinUrl && config.apiKey && user.jellyfinId) {
          // Check if user exists in Jellyfin
          const checkUserResponse = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}`, {
            headers: {
              'X-Emby-Token': config.apiKey,
            },
          })
          
          if (!checkUserResponse.ok) {
            // User doesn't exist in Jellyfin, need to recreate
            authLogger.info('User exists in JellyConnect but not in Jellyfin, recreating')
            
            const securePassword = generateSecurePassword()
            const createUserResponse = await fetch(`${config.jellyfinUrl}/Users/New`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Emby-Token': config.apiKey,
              },
              body: JSON.stringify({
                Name: user.jellyfinUsername,
                Password: securePassword,
              }),
            })
            
            if (createUserResponse.ok) {
              const jellyfinUser = await createUserResponse.json()
              const newUserId = jellyfinUser.Id
              
              if (newUserId) {
                user.jellyfinId = newUserId
                user.id = newUserId
                // Store the new encrypted password
                user.jellyfinPasswordEncrypted = encrypt(securePassword)
                saveDatabaseImmediate()  // Persist immediately
                authLogger.info('Recreated user in Jellyfin with new ID', { newUserId })
              }
            } else {
              authLogger.error('Failed to recreate user in Jellyfin', { status: checkUserResponse.status })
            }
          } else {
            authLogger.info('User verified to exist in Jellyfin')
            
            // Auto-fix: If user exists but doesn't have stored password, update it
            // This enables QuickConnect to work for SSO users
            if (!user.jellyfinPasswordEncrypted) {
              authLogger.info('User missing encrypted password, updating')
              try {
                const securePassword = generateSecurePassword()
                
                // Update password in Jellyfin using the correct API format
                // The /Users/{userId}/Password endpoint with admin token requires userId query param
                const updatePwResponse = await fetch(`${config.jellyfinUrl}/Users/Password?userId=${user.jellyfinId}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Emby-Token': config.apiKey,
                  },
                  body: JSON.stringify({
                    NewPw: securePassword,
                    ResetPassword: true
                  }),
                })
                
                if (updatePwResponse.ok || updatePwResponse.status === 204) {
                  user.jellyfinPasswordEncrypted = encrypt(securePassword)
                  saveDatabaseImmediate()  // Persist immediately
                  authLogger.info('Password updated and encrypted for QuickConnect support')
                } else {
                  const errorText = await updatePwResponse.text()
                  authLogger.error('Failed to update password', { status: updatePwResponse.status, error: errorText })
                }
              } catch (pwError) {
                authLogger.error('Error updating password', { error: pwError instanceof Error ? pwError.message : 'Unknown error' })
              }
            }
          }
        }
      } catch (error) {
        authLogger.error('Error verifying user in Jellyfin', { error: error instanceof Error ? error.message : 'Unknown error' })
        // Continue anyway - don't fail the login
      }
      
      // Update groups if provided
      const newGroups = userinfo.groups || userinfo.roles || userinfo.oidc_groups || []
      const groupsArray = Array.isArray(newGroups) ? newGroups : (newGroups ? [newGroups] : [])
      
      authLogger.info('Group extraction for existing user', {
        email: user.email,
        userinfo_groups: userinfo.groups,
        userinfo_roles: userinfo.roles,
        userinfo_oidc_groups: userinfo.oidc_groups,
        extractedGroups: newGroups,
        groupsArray,
        existingOidcGroups: user.oidcGroups,
      })
      
      // Check if groups have changed
      const groupsChanged = 
        !user.oidcGroups || 
        JSON.stringify(user.oidcGroups?.sort()) !== JSON.stringify(groupsArray.sort())
      
      authLogger.info('Group change detection', {
        email: user.email,
        groupsChanged,
        hasExistingGroups: !!user.oidcGroups,
        existingGroupsLength: user.oidcGroups?.length || 0,
        newGroupsLength: groupsArray.length,
      })
      
      if (groupsChanged && groupsArray.length > 0) {
        user.oidcGroups = groupsArray
        authLogger.info('Updated groups for existing user', { email: user.email, groups: groupsArray })
      } else {
        authLogger.info('Groups unchanged for existing user', { email: user.email, currentGroups: user.oidcGroups })
      }
      
      // Update display name if provided
      const displayName = userinfo.name || userinfo.preferred_username
      if (displayName && displayName !== user.displayName) {
        user.displayName = displayName
        authLogger.info('Updated display name for existing user', { email: user.email, displayName })
      }
      
      // Save if anything changed
      if (groupsChanged || (displayName && displayName !== user.displayName)) {
        saveDatabaseImmediate()
      }
      
      // Apply role update to Jellyfin if groups changed
      if (groupsChanged) {
        try {
          const { getConfig } = await import('@/app/lib/config')
          const config = getConfig()
          
          if (config.jellyfinUrl && config.apiKey && user.jellyfinId) {
            const newRole = mapGroupsToRole(groupsArray)
            if (newRole === null) {
              authLogger.error('Access denied: Existing user no longer belongs to any configured groups', {
                email: user.email,
                userId: user.jellyfinId,
                oldGroups: user.oidcGroups,
                newGroups: groupsArray
              })
              return NextResponse.redirect(
                new URL('/login?error=AccessDenied', baseUrl)
              )
            }
            const rolePolicy = getRolePolicyForJellyfin(newRole)
            
            // Get current policy to preserve auth provider IDs
            let currentPolicy: any = {}
            try {
              const currentUserResponse = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}`, {
                headers: {
                  'X-Emby-Token': config.apiKey,
                },
              })
              if (currentUserResponse.ok) {
                const currentUser = await currentUserResponse.json()
                currentPolicy = currentUser.Policy || {}
              }
            } catch (error) {
              authLogger.error('Failed to get current user policy for role update', { error: error instanceof Error ? error.message : 'Unknown error' })
            }
            
            const newPolicy = {
              ...rolePolicy,
              AuthenticationProviderId: currentPolicy.AuthenticationProviderId || 'Jellyfin.Server.Implementations.Users.DefaultAuthenticationProvider',
              PasswordResetProviderId: currentPolicy.PasswordResetProviderId || 'Jellyfin.Server.Implementations.Users.DefaultPasswordResetProvider',
            }
            
            authLogger.info('Applying role update for existing user', {
              email: user.email,
              userId: user.jellyfinId,
              groups: groupsArray,
              mappedRole: newRole,
              isAdmin: newPolicy.IsAdministrator
            })
            
            const policyResponse = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}/Policy`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Emby-Token': config.apiKey,
              },
              body: JSON.stringify(newPolicy),
            })
            
            if (policyResponse.ok) {
              authLogger.info('Successfully updated user role in Jellyfin', { newRole })
            } else {
              const errorText = await policyResponse.text()
              authLogger.error('Failed to update user role in Jellyfin', {
                status: policyResponse.status,
                error: errorText
              })
            }
          } else {
            authLogger.warn('Cannot update role - missing Jellyfin config or user ID')
          }
        } catch (error) {
          authLogger.error('Error updating user role', { error: error instanceof Error ? error.message : 'Unknown error' })
          // Don't fail the login if role update fails
        }
      }
    }

    // At this point, user is always defined (either found or newly created)
    const currentUser = user!

    // Create session JWT
    const { createAccessToken } = await import('@/app/lib/auth')
    const sessionToken = await createAccessToken({
      sub: currentUser.id,
      email: currentUser.email,
      jellyfinId: currentUser.jellyfinId,
      oidcProvider: providerConfig.name,
    })

    authLogger.info('Session token created', { tokenLength: sessionToken.length })

    // Redirect to callback complete page which will verify session and redirect to home
    const redirectUrl = new URL('/auth/callback/complete', baseUrl)
    authLogger.info('Redirecting to callback complete page', { redirectUrl: redirectUrl.toString() })
    
    const response = NextResponse.redirect(redirectUrl)

    // Set the NextAuth session cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    }
    
    response.cookies.set('next-auth.session-token', sessionToken, cookieOptions)
    
    // Log the Set-Cookie header
    const setCookieHeader = response.headers.get('Set-Cookie')
    authLogger.info('Set-Cookie header set', { setCookieHeader: setCookieHeader ? setCookieHeader.substring(0, 100) + '...' : 'NONE' })
    authLogger.debug('Cookie options', cookieOptions)

    return response
  } catch (error) {
    authLogger.error('Unexpected error in OIDC callback', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.redirect(
      new URL(`/login?error=server_error&message=${encodeURIComponent((error as Error).message.substring(0, 100))}`, baseUrl)
    )
  }
}
