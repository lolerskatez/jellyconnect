import { NextRequest, NextResponse } from 'next/server'
import { JellyfinAuth } from '@/app/lib/jellyfin'
import { getConfig } from '@/app/lib/config'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username and password are required' },
      { status: 400 }
    )
  }

  const config = getConfig()
  const jellyfin = new JellyfinAuth(config.jellyfinUrl, config.apiKey)

  try {
    const authResponse = await jellyfin.authenticate(username, password)
    if (authResponse && authResponse.token) {
      return NextResponse.json({
        user: authResponse.user,
        token: authResponse.token
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
