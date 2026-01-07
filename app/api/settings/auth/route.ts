import { NextRequest, NextResponse } from 'next/server'
import { getAuthSettings, updateAuthSettings } from '@/app/lib/auth-settings'
import { saveDatabaseImmediate } from '@/app/lib/db'
import { authSettingsLogger } from '@/app/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const settings = getAuthSettings()
    return NextResponse.json(settings)
  } catch (error) {
    authSettingsLogger.error('Error fetching auth settings', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    authSettingsLogger.info('Saving auth settings', { settings: body })
    
    // Validate that forceOIDC and oidcEnabled are compatible
    if (body.forceOIDC && !body.oidcEnabled) {
      return NextResponse.json(
        { error: 'Cannot force OIDC-only mode without OIDC enabled' },
        { status: 400 }
      )
    }

    const updatedSettings = updateAuthSettings(body)
    authSettingsLogger.info('Updated auth settings', { settings: updatedSettings })
    
    saveDatabaseImmediate()
    authSettingsLogger.info('Auth settings saved to database')
    
    return NextResponse.json(updatedSettings)
  } catch (error) {
    authSettingsLogger.error('Error updating auth settings', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
