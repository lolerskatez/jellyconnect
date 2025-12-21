import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const config = getConfig()
    if (!config.jellyfinUrl || !config.apiKey) {
      return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
    }

    // The user is already logged into JellyConnect, so they have a Jellyfin token
    // We need to get it from their session. For simplicity, we'll use the API key 
    // to authenticate as an admin and authorize the Quick Connect session
    
    console.log('[Quick Connect Authorize] Attempting to authorize code:', code)

    // Authorize the Quick Connect session using admin API key
    const authorizeRes = await fetch(`${config.jellyfinUrl}/QuickConnect/Authorize?code=${code}`, {
      method: 'POST',
      headers: {
        'X-Emby-Authorization': `MediaBrowser Client="JellyConnect", Device="Web App", DeviceId="web-app-1", Version="1.0.0", Token="${config.apiKey}"`
      }
    })

    if (!authorizeRes.ok) {
      const errorText = await authorizeRes.text()
      console.error('[Quick Connect Authorize] Authorization failed:', authorizeRes.status, errorText)
      return NextResponse.json({ error: 'Failed to authorize Quick Connect session' }, { status: 500 })
    }

    const authorizeData = await authorizeRes.json()
    console.log('[Quick Connect Authorize] Successfully authorized code:', code)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Authorize Quick Connect error:', error)
    return NextResponse.json({ error: 'Failed to authorize Quick Connect' }, { status: 500 })
  }
}
