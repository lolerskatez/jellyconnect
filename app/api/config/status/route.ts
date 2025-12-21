import { NextResponse } from 'next/server'
import { getConfig } from '@/app/lib/config'

export async function GET() {
  const config = getConfig()
  const isConfigured = !!(config.jellyfinUrl && config.apiKey)
  return NextResponse.json({
    isConfigured,
    jellyfinUrl: isConfigured ? config.jellyfinUrl : null
  })
}