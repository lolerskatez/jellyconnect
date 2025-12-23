import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const config = getConfig()
    const { id } = await params
    const res = await fetch(`${config.jellyfinUrl}/Users/${id}`, {
      headers: { 'X-Emby-Token': config.apiKey }
    })
    if (!res.ok) throw new Error('User not found')
    const user = await res.json()
    
    // Add oidcProvider from database if available
    try {
      const { getUserById } = await import('@/app/lib/db/queries')
      const dbUser = await getUserById(id)
      if (dbUser?.oidcProvider) {
        user.oidcProvider = dbUser.oidcProvider
      } else {
        // Explicitly set to undefined for local users (not SSO)
        user.oidcProvider = undefined
      }
    } catch (error) {
      console.log('Could not fetch oidcProvider from database:', error)
      // If we can't check the database, assume local user
      user.oidcProvider = undefined
    }
    
    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const config = getConfig()
    const { id } = await params
    const res = await fetch(`${config.jellyfinUrl}/Users/${id}`, {
      method: 'DELETE',
      headers: { 'X-Emby-Token': config.apiKey }
    })
    if (!res.ok) throw new Error('Failed to delete user')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const config = getConfig()
    const { id } = await params
    const body = await request.json()

    // First, fetch the current user to get existing policy fields
    const userRes = await fetch(`${config.jellyfinUrl}/Users/${id}`, {
      headers: { 'X-Emby-Token': config.apiKey }
    })
    if (!userRes.ok) throw new Error('Failed to fetch user')
    const currentUser = await userRes.json()
    const currentPolicy = currentUser.Policy || {}

    // Merge new policy with required fields - use hardcoded Jellyfin defaults
    const policyToUpdate = {
      ...currentPolicy,
      ...body,
      // Always include these required Jellyfin fields
      PasswordResetProviderId: 'Jellyfin.Server.Implementations.Users.DefaultPasswordResetProvider',
      AuthenticationProviderId: 'Jellyfin.Server.Implementations.Users.DefaultAuthenticationProvider'
    }

    // Update user policy
    const res = await fetch(`${config.jellyfinUrl}/Users/${id}/Policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': config.apiKey
      },
      body: JSON.stringify(policyToUpdate)
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Failed to update user policy: ${errorText}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update user policy:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user policy' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const config = getConfig();
    const { id } = await params;
    const { name, password, email, discordUsername, displayName } = await request.json();

    const updateData: any = {};
    if (name) updateData.Name = name;
    if (password) updateData.Password = password;

    const updateRes = await fetch(`${config.jellyfinUrl}/Users/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Emby-Token': config.apiKey },
      body: JSON.stringify(updateData)
    });
    const updatedUser = await updateRes.json();

    // Update email, Discord username, and display name in our database
    if (email !== undefined || discordUsername !== undefined || displayName !== undefined) {
      const { updateUser } = await import('@/app/lib/db/queries');
      const dbUpdates: any = {};
      if (email !== undefined) dbUpdates.email = email;
      if (discordUsername !== undefined) dbUpdates.discordUsername = discordUsername;
      if (displayName !== undefined) dbUpdates.displayName = displayName;
      
      updateUser(id, dbUpdates);
      console.log(`User ${id} profile updated:`, dbUpdates);
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}