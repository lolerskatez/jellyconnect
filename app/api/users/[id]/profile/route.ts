import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/app/lib/db/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = getUserById(id)
    
    if (!user) {
      return NextResponse.json({
        displayName: undefined,
        email: undefined,
        discordUsername: undefined
      })
    }
    
    return NextResponse.json({
      displayName: user.displayName,
      email: user.email,
      discordUsername: user.discordUsername
    })
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}
