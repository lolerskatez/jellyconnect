import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/app/lib/db'
import { getOIDCProviderConfig } from '@/app/lib/auth-settings'
import { generateSecurePassword, generateSecureUsername } from '@/app/lib/secure-password'
import { mapGroupsToRole, getRolePolicyForJellyfin } from '@/app/lib/oidc-group-mapping'

// Get the base URL for redirects - use NEXTAUTH_URL to ensure consistency
function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'http://localhost:3000'
}

/**
 * Generic OIDC callback handler
 * Works with any configured OIDC provider (Authentik, Keycloak, etc.)
 * Receives the authorization code and exchanges it for tokens
 */
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl()
  
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('[OIDC CALLBACK] Callback received:', { code: code?.substring(0, 20) + '...', state, error })
    console.log('[OIDC CALLBACK] Using base URL for redirects:', baseUrl)

    // Check for errors from provider
    if (error) {
      const errorMsg = errorDescription || error
      console.error('[OIDC CALLBACK] Provider error:', errorMsg)
      return NextResponse.redirect(
        new URL(`/login?error=oidc_error&message=${encodeURIComponent(errorMsg.substring(0, 100))}`, baseUrl)
      )
    }

    if (!code) {
      console.error('[OIDC CALLBACK] No authorization code received')
      return NextResponse.redirect(new URL('/login?error=no_code', baseUrl))
    }

    if (!state) {
      console.error('[OIDC CALLBACK] No state received')
      return NextResponse.redirect(new URL('/login?error=no_state', baseUrl))
    }

    // Get provider configuration from database
    const providerConfig = getOIDCProviderConfig()
    if (!providerConfig) {
      console.error('[OIDC CALLBACK] No OIDC provider configured')
      return NextResponse.redirect(new URL('/login?error=provider_not_configured', baseUrl))
    }

    console.log('[OIDC CALLBACK] Using provider:', providerConfig.name)

    // Build redirect URI - must match what was sent to the provider
    const redirectUri = `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host') || req.headers.get('host')}/api/auth/callback/oidc`

    console.log('[OIDC CALLBACK] Exchanging code for tokens:', {
      provider: providerConfig.name,
      clientId: providerConfig.clientId,
      redirectUri,
    })

    // Exchange authorization code for tokens
    const tokenEndpoint = providerConfig.tokenEndpoint
    console.log('[OIDC CALLBACK] Token endpoint being used:', tokenEndpoint)
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[OIDC CALLBACK] Token exchange failed:', {
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
    console.log('[OIDC CALLBACK] Tokens received:', {
      accessToken: tokens.access_token?.substring(0, 20) + '...',
      idToken: tokens.id_token?.substring(0, 20) + '...',
      expiresIn: tokens.expires_in,
    })

    // Fetch user information
    const userinfoEndpoint = providerConfig.userinfoEndpoint
    
    console.log('[OIDC CALLBACK] Fetching user info from:', userinfoEndpoint)
    
    const userinfoResponse = await fetch(userinfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userinfoResponse.ok) {
      const error = await userinfoResponse.text()
      console.error('[OIDC CALLBACK] Userinfo request failed:', userinfoResponse.status, error)
      return NextResponse.redirect(
        new URL(`/login?error=userinfo_failed&message=${encodeURIComponent(error.substring(0, 100))}`, baseUrl)
      )
    }

    const userinfo = await userinfoResponse.json()
    console.log('[OIDC CALLBACK] User info received:', {
      sub: userinfo.sub,
      email: userinfo.email,
      name: userinfo.name || userinfo.preferred_username,
    })

    if (!userinfo.email) {
      console.error('[OIDC CALLBACK] No email in user info')
      return NextResponse.redirect(new URL('/login?error=no_email', baseUrl))
    }

    // Check if user exists
    let user = database.users.find(u => u.email === userinfo.email)

    if (!user) {
      // Auto-create user in Jellyfin with enhanced features
      console.log('[OIDC CALLBACK] Creating new user:', userinfo.email)
      const { getConfig } = await import('@/app/lib/config')
      const config = getConfig()
      
      if (!config.jellyfinUrl || !config.apiKey) {
        console.error('[OIDC CALLBACK] Jellyfin not configured')
        return NextResponse.redirect(new URL('/login?error=jellyfin_not_configured', baseUrl))
      }

      // Extract groups from OIDC userinfo
      // Different providers use different claim names for groups:
      // - 'groups' (common)
      // - 'roles' (some providers)
      // - 'oidc_groups' (custom)
      const groups = userinfo.groups || userinfo.roles || userinfo.oidc_groups || []
      const groupsArray = Array.isArray(groups) ? groups : [groups]
      
      // Map OIDC groups to Jellyfin role
      const role = mapGroupsToRole(groupsArray)
      console.log('[OIDC CALLBACK] Mapped role:', role, 'from groups:', groupsArray)

      // Use SSO provider's username (preferred_username or name), fallback to email prefix
      const jellyfinUsername = userinfo.preferred_username || userinfo.name || userinfo.email.split('@')[0]
      const securePassword = generateSecurePassword()

      console.log('[OIDC CALLBACK] Creating Jellyfin user with username:', jellyfinUsername, 'and role:', role)

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
        console.log('[OIDC CALLBACK] User creation returned error:', createUserResponse.status, error)
        
        // If user creation failed, try to find existing user with this username
        console.log('[OIDC CALLBACK] Checking if user already exists in Jellyfin...')
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
              console.log('[OIDC CALLBACK] Found existing Jellyfin user:', existingUser.Name, existingUser.Id)
              userId = existingUser.Id
              jellyfinUser = existingUser
            }
          }
        } catch (findError) {
          console.error('[OIDC CALLBACK] Error finding existing user:', findError)
        }
        
        if (!userId) {
          console.error('[OIDC CALLBACK] Failed to create or find Jellyfin user')
          return NextResponse.redirect(new URL('/login?error=user_creation_failed', baseUrl))
        }
      } else {
        jellyfinUser = await createUserResponse.json()
        userId = jellyfinUser.Id
      }

      if (!userId) {
        console.error('[OIDC CALLBACK] No user ID returned from Jellyfin')
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
          console.log('[OIDC CALLBACK] Got current user policy, AuthProviderId:', currentPolicy.AuthenticationProviderId)
        }
      } catch (error) {
        console.error('[OIDC CALLBACK] Failed to get current user policy:', error)
      }

      // Apply the role-based policy merged with required fields from current policy
      const rolePolicy = getRolePolicyForJellyfin(role)
      const policy = {
        ...rolePolicy,
        // Preserve the auth provider IDs from Jellyfin (required fields)
        AuthenticationProviderId: currentPolicy.AuthenticationProviderId || 'Jellyfin.Server.Implementations.Users.DefaultAuthenticationProvider',
        PasswordResetProviderId: currentPolicy.PasswordResetProviderId || 'Jellyfin.Server.Implementations.Users.DefaultPasswordResetProvider',
      }
      
      console.log('[OIDC CALLBACK] Applying role policy to new user:', {
        userId,
        role,
        isAdministrator: policy.IsAdministrator,
        enableContentDeletion: policy.EnableContentDeletion,
        authProviderId: policy.AuthenticationProviderId
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
        console.error('[OIDC CALLBACK] Failed to apply policy to user:', {
          status: policyResponse.status,
          error: errorText
        })
        // Continue anyway - user is created, but log the policy application failure
      } else {
        console.log('[OIDC CALLBACK] Policy applied successfully to new user with role:', role)
      }

      user = {
        id: userId,
        jellyfinId: userId,
        jellyfinUsername,
        email: userinfo.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        oidcProvider: providerConfig.name,
        oidcProviderId: userinfo.sub,
        oidcGroups: groupsArray,
      } as any

      database.users.push(user)
      console.log('[OIDC CALLBACK] User created successfully:', {
        email: user.email,
        jellyfinId: userId,
        jellyfinUsername,
        role,
        groups: groupsArray
      })
    } else {
      console.log('[OIDC CALLBACK] Existing user found:', user.email)
      // Update OIDC provider info and groups
      user.oidcProvider = providerConfig.name
      user.oidcProviderId = userinfo.sub
      user.updatedAt = new Date().toISOString()
      
      // Migrate legacy users (add username if missing)
      if (!user.jellyfinUsername) {
        user.jellyfinUsername = generateSecureUsername(user.email)
        console.log('[OIDC CALLBACK] Migrated legacy user - generated username:', user.jellyfinUsername)
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
            console.log('[OIDC CALLBACK] User exists in JellyConnect but not in Jellyfin, recreating...')
            
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
                console.log('[OIDC CALLBACK] Recreated user in Jellyfin with new ID:', newUserId)
              }
            } else {
              console.error('[OIDC CALLBACK] Failed to recreate user in Jellyfin:', checkUserResponse.status)
            }
          } else {
            console.log('[OIDC CALLBACK] User verified to exist in Jellyfin')
          }
        }
      } catch (error) {
        console.error('[OIDC CALLBACK] Error verifying user in Jellyfin:', error)
        // Continue anyway - don't fail the login
      }
      
      // Update groups if provided
      const newGroups = userinfo.groups || userinfo.roles || userinfo.oidc_groups || []
      const groupsArray = Array.isArray(newGroups) ? newGroups : (newGroups ? [newGroups] : [])
      
      // Check if groups have changed
      const groupsChanged = 
        !user.oidcGroups || 
        JSON.stringify(user.oidcGroups?.sort()) !== JSON.stringify(groupsArray.sort())
      
      if (groupsChanged && groupsArray.length > 0) {
        user.oidcGroups = groupsArray
        console.log('[OIDC CALLBACK] Updated groups for existing user:', user.email, groupsArray)
        
        // Apply role update to Jellyfin if groups changed
        try {
          const { getConfig } = await import('@/app/lib/config')
          const config = getConfig()
          
          if (config.jellyfinUrl && config.apiKey && user.jellyfinId) {
            const newRole = mapGroupsToRole(groupsArray)
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
              console.error('[OIDC CALLBACK] Failed to get current user policy:', error)
            }
            
            const newPolicy = {
              ...rolePolicy,
              AuthenticationProviderId: currentPolicy.AuthenticationProviderId || 'Jellyfin.Server.Implementations.Users.DefaultAuthenticationProvider',
              PasswordResetProviderId: currentPolicy.PasswordResetProviderId || 'Jellyfin.Server.Implementations.Users.DefaultPasswordResetProvider',
            }
            
            console.log('[OIDC CALLBACK] Applying role update for existing user:', {
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
              console.log('[OIDC CALLBACK] Successfully updated user role in Jellyfin to:', newRole)
            } else {
              const errorText = await policyResponse.text()
              console.error('[OIDC CALLBACK] Failed to update user role in Jellyfin:', {
                status: policyResponse.status,
                error: errorText
              })
            }
          } else {
            console.warn('[OIDC CALLBACK] Cannot update role - missing Jellyfin config or user ID')
          }
        } catch (error) {
          console.error('[OIDC CALLBACK] Error updating user role:', error)
          // Don't fail the login if role update fails
        }
      } else if (groupsArray.length > 0) {
        console.log('[OIDC CALLBACK] Groups unchanged for existing user:', user.email, 'current groups:', user.oidcGroups)
      }
    }

    // Create session JWT
    const { createAccessToken } = await import('@/app/lib/auth')
    const sessionToken = await createAccessToken({
      sub: user.id,
      email: user.email,
      jellyfinId: user.jellyfinId,
      oidcProvider: providerConfig.name,
    })

    console.log('[OIDC CALLBACK] Session token created, length:', sessionToken.length)

    // Redirect to callback complete page which will verify session and redirect to home
    const redirectUrl = new URL('/auth/callback/complete', baseUrl)
    console.log('[OIDC CALLBACK] Redirecting to:', redirectUrl.toString())
    
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
    console.log('[OIDC CALLBACK] Set-Cookie header:', setCookieHeader ? setCookieHeader.substring(0, 100) + '...' : 'NONE')
    console.log('[OIDC CALLBACK] Cookie options:', JSON.stringify(cookieOptions))

    return response
  } catch (error) {
    console.error('[OIDC CALLBACK] Unexpected error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=server_error&message=${encodeURIComponent((error as Error).message.substring(0, 100))}`, baseUrl)
    )
  }
}
