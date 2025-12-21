import { NextRequest, NextResponse } from 'next/server'
import { saveConfig } from '@/app/lib/config'
import { buildJellyfinBaseUrl } from '@/app/lib/jellyfin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jellyfinUrl, adminUsername, adminPassword } = body

    console.log('Setup request received:', { jellyfinUrl, adminUsername, adminPassword: '***' })

    // Basic validation
    if (!jellyfinUrl || !adminUsername || !adminPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const processedUrl = buildJellyfinBaseUrl(jellyfinUrl)
    console.log('Processed Jellyfin URL:', processedUrl)

    // Authenticate as admin to get token
    // Note: Jellyfin requires proper X-Emby-Authorization header format
    console.log('Attempting to authenticate with Jellyfin...')
    let authRes: Response
    try {
      authRes = await fetch(`${processedUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization': 'MediaBrowser Client="JellyConnect", Device="Web", DeviceId="jellyconnect-0", Version="0.0.1"'
        },
        body: JSON.stringify({
          Username: adminUsername,
          Pw: adminPassword
        })
      })
    } catch (fetchError) {
      console.error('Failed to connect to Jellyfin server:', fetchError)
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError)
      return NextResponse.json({ 
        error: 'Unable to connect to Jellyfin server. Please check the URL and ensure the server is running and accessible.',
        details: `Connection failed to ${processedUrl}. Error: ${errorMessage}`
      }, { status: 500 })
    }

    console.log('Jellyfin auth response status:', authRes.status)

    if (!authRes.ok) {
      const errorText = await authRes.text()
      console.error('Jellyfin auth failed:', authRes.status, errorText)
      // Return more helpful error message
      return NextResponse.json({ 
        error: 'Invalid Jellyfin credentials or authentication failed',
        details: errorText
      }, { status: 401 })
    }

    const auth = await authRes.json()
    console.log('Jellyfin auth successful, got token and userId')
    const token = auth.AccessToken
    const userId = auth.User.Id
    const isAdmin = auth.User.Policy?.IsAdministrator || false

    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'The provided user is not an administrator. API key creation requires administrator privileges.',
        details: 'Please use an administrator account for setup.'
      }, { status: 403 })
    }

    // Create an API key using the authenticated token
    // According to Jellyfin API docs: POST /Auth/Keys?app=<appName>
    console.log('Creating API key with authenticated token...')
    
    let apiKeyRes: Response
    try {
      // Use the X-Emby-Token header for authenticated API calls
      // The app parameter is required
      apiKeyRes = await fetch(`${processedUrl}/Auth/Keys?app=JellyConnect`, {
        method: 'POST',
        headers: {
          'X-Emby-Token': token,
        }
      })
    } catch (fetchError) {
      console.error('Failed to create API key:', fetchError)
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError)
      return NextResponse.json({ 
        error: 'Failed to create API key',
        details: `Connection error: ${errorMessage}`
      }, { status: 500 })
    }

    if (!apiKeyRes.ok) {
      const errorText = await apiKeyRes.text()
      console.error('API key creation failed:', apiKeyRes.status, errorText)
      return NextResponse.json({ 
        error: 'Failed to create API key',
        details: `${apiKeyRes.status}: ${errorText}`
      }, { status: apiKeyRes.status })
    }

    // According to Jellyfin API docs, successful response is 204 with no content
    // In that case, we can use the token we already have
    console.log('API key created successfully (HTTP 204 No Content)')
    
    // For API key, we can use the access token obtained from authentication
    // Or we can query /Auth/Keys to get the newly created key
    const apiKey = token

    console.log('API key created successfully')
    saveConfig({
      jellyfinUrl: processedUrl,
      apiKey,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error during setup:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred during setup',
      details: errorMessage
    }, { status: 500 })
  }
}