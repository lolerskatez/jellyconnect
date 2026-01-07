import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/app/lib/db/queries'
import { userLogger } from '@/app/lib/logger'

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
    userLogger.error('Failed to fetch user profile', { userId: id, error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}
