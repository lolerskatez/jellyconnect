import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'
import { usersLogger } from '@/app/lib/logger'

/**
 * Change password for a local Jellyfin user
 * Requires current password for verification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const config = getConfig()
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // First, get the user to find their username
    const userRes = await fetch(`${config.jellyfinUrl}/Users/${id}`, {
      headers: { 'X-Emby-Token': config.apiKey }
    })

    if (!userRes.ok) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = await userRes.json()
    const username = user.Name

    // Verify current password by attempting to authenticate
    if (currentPassword) {
      try {
        const authRes = await fetch(`${config.jellyfinUrl}/Users/AuthenticateByName`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': 'MediaBrowser Client="JellyConnect", Device="Web App", DeviceId="web-app-1", Version="1.0.0"'
          },
          body: JSON.stringify({
            Username: username,
            Pw: currentPassword
          })
        })

        if (!authRes.ok) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 401 }
          )
        }
      } catch (error) {
        usersLogger.error('Error verifying current password', { userId: id, error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
          { error: 'Failed to verify current password' },
          { status: 500 }
        )
      }
    }

    // Update the password in Jellyfin using the correct API format
    // The correct endpoint is /Users/Password?userId=... not /Users/{id}/Password
    try {
      const updateRes = await fetch(`${config.jellyfinUrl}/Users/Password?userId=${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Token': config.apiKey
        },
        body: JSON.stringify({
          NewPw: newPassword,
          ResetPassword: false
        })
      })

      if (!updateRes.ok && updateRes.status !== 204) {
        const errorText = await updateRes.text()
        usersLogger.error('Password update failed', { userId: id, status: updateRes.status, error: errorText })
        return NextResponse.json(
          { error: 'Failed to update password in Jellyfin' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, message: 'Password changed successfully' })
    } catch (error) {
      usersLogger.error('Error updating password', { userId: id, error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }
  } catch (error) {
    usersLogger.error('Password change error', { userId: id, error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'An error occurred while changing password' },
      { status: 500 }
    )
  }
}
