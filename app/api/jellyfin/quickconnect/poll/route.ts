import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'

export async function GET(request: NextRequest) {
  try {
    const secret = request.cookies.get('jellyfin_qc_secret')?.value
    if (!secret) {
      return NextResponse.json({ error: 'No Quick Connect session' }, { status: 400 })
    }

    const config = getConfig()
    if (!config.jellyfinUrl) {
      return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
    }

    // Poll Quick Connect status
    const pollRes = await fetch(`${config.jellyfinUrl}/QuickConnect/Connect?secret=${secret}`, {
      method: 'GET'
    })

    if (!pollRes.ok) {
      return NextResponse.json({ error: 'Failed to poll Quick Connect' }, { status: 500 })
    }

    const pollData = await pollRes.json()

    // If authenticated, clear the secret cookie
    if (pollData.Authenticated) {
      const response = NextResponse.json(pollData)
      response.cookies.set('jellyfin_qc_secret', '', { maxAge: 0 })
      return response
    }

    return NextResponse.json(pollData)

  } catch (error) {
    console.error('Quick Connect poll error:', error)
    return NextResponse.json({ error: 'Failed to poll Quick Connect status' }, { status: 500 })
  }
}