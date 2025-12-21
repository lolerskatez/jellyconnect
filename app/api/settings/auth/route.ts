import { NextRequest, NextResponse } from 'next/server'
import { getAuthSettings, updateAuthSettings } from '@/app/lib/auth-settings'
import { saveDatabaseImmediate } from '@/app/lib/db'

export async function GET(request: NextRequest) {
  try {
    const settings = getAuthSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching auth settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate that forceOIDC and oidcEnabled are compatible
    if (body.forceOIDC && !body.oidcEnabled) {
      return NextResponse.json(
        { error: 'Cannot force OIDC-only mode without OIDC enabled' },
        { status: 400 }
      )
    }

    const updatedSettings = updateAuthSettings(body)
    await saveDatabaseImmediate()
    
    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Error updating auth settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
