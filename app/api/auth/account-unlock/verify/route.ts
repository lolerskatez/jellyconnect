import { NextRequest, NextResponse } from 'next/server'
import { database, saveDatabaseImmediate } from '@/app/lib/db'
import { getConfig } from '@/app/lib/config'
import { authLogger } from '@/app/lib/logger'

const logger = authLogger

const MAX_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json()
    
    if (!userId || !code) {
      return NextResponse.json({ error: 'User ID and security code are required' }, { status: 400 })
    }
    
    const db = database
    const config = await getConfig()
    
    // Find the unlock request
    const requestIndex = db.accountUnlockRequests?.findIndex(
      (r: any) => r.userId === userId
    )
    
    if (requestIndex === undefined || requestIndex === -1) {
      logger.warn('Account unlock verification attempted with no request', { userId })
      return NextResponse.json({ 
        error: 'No unlock request found. Please request a new security code.',
        code: 'NO_REQUEST'
      }, { status: 400 })
    }
    
    const unlockRequest = db.accountUnlockRequests[requestIndex]
    
    // Check if expired
    if (new Date(unlockRequest.expiresAt) < new Date()) {
      // Remove expired request
      db.accountUnlockRequests.splice(requestIndex, 1)
      saveDatabaseImmediate()
      
      logger.warn('Expired account unlock code used', { userId })
      return NextResponse.json({ 
        error: 'Security code has expired. Please request a new one.',
        code: 'CODE_EXPIRED'
      }, { status: 400 })
    }
    
    // Check attempts
    if (unlockRequest.attempts >= MAX_ATTEMPTS) {
      // Remove request after too many attempts
      db.accountUnlockRequests.splice(requestIndex, 1)
      saveDatabaseImmediate()
      
      logger.warn('Too many account unlock attempts', { userId })
      return NextResponse.json({ 
        error: 'Too many incorrect attempts. Please request a new security code.',
        code: 'TOO_MANY_ATTEMPTS'
      }, { status: 429 })
    }
    
    // Verify code
    if (unlockRequest.code !== code.toString().trim()) {
      // Increment attempts
      db.accountUnlockRequests[requestIndex].attempts += 1
      saveDatabaseImmediate()
      
      const remainingAttempts = MAX_ATTEMPTS - db.accountUnlockRequests[requestIndex].attempts
      logger.warn('Invalid account unlock code', { userId, remainingAttempts })
      
      return NextResponse.json({ 
        error: `Invalid security code. ${remainingAttempts} attempts remaining.`,
        code: 'INVALID_CODE',
        remainingAttempts
      }, { status: 400 })
    }
    
    // Code is valid - enable the user in Jellyfin
    const user = db.users?.find((u: any) => u.id === userId)
    
    if (!user || !user.jellyfinId) {
      logger.error('User not found for account unlock', { userId })
      return NextResponse.json({ 
        error: 'User not found. Please contact your administrator.',
        code: 'USER_NOT_FOUND'
      }, { status: 404 })
    }
    
    if (!config.apiKey) {
      logger.error('No API key configured for account unlock')
      return NextResponse.json({ 
        error: 'Server configuration error. Please contact your administrator.',
        code: 'CONFIG_ERROR'
      }, { status: 500 })
    }
    
    // Get current Jellyfin user policy
    const jellyfinRes = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}`, {
      headers: { 'X-Emby-Token': config.apiKey }
    })
    
    if (!jellyfinRes.ok) {
      logger.error('Failed to get Jellyfin user', { userId, status: jellyfinRes.status })
      return NextResponse.json({ 
        error: 'Failed to verify account status. Please contact your administrator.',
        code: 'JELLYFIN_ERROR'
      }, { status: 500 })
    }
    
    const jellyfinUser = await jellyfinRes.json()
    
    // Enable the user
    const enableRes = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}/Policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': config.apiKey
      },
      body: JSON.stringify({
        ...jellyfinUser.Policy,
        IsDisabled: false
      })
    })
    
    if (!enableRes.ok && enableRes.status !== 204) {
      logger.error('Failed to enable Jellyfin user', { userId, status: enableRes.status })
      return NextResponse.json({ 
        error: 'Failed to unlock account. Please contact your administrator.',
        code: 'ENABLE_FAILED'
      }, { status: 500 })
    }
    
    // Remove the unlock request
    db.accountUnlockRequests.splice(requestIndex, 1)
    saveDatabaseImmediate()
    
    logger.info('Account successfully unlocked', { userId, jellyfinId: user.jellyfinId })
    
    return NextResponse.json({ 
      message: 'Your account has been unlocked. You can now log in.',
      success: true
    })
    
  } catch (error) {
    logger.error('Account unlock verification error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'An error occurred processing your request' }, { status: 500 })
  }
}
