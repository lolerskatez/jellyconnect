import { NextRequest, NextResponse } from 'next/server'
import { database, saveDatabaseImmediate } from '@/app/lib/db'
import { getConfig } from '@/app/lib/config'
import { emailService } from '@/app/lib/email'
import { authLogger } from '@/app/lib/logger'
import crypto from 'crypto'

const logger = authLogger

// Generate a 6-digit security code
function generateSecurityCode(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json()
    
    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or user ID is required' }, { status: 400 })
    }
    
    const db = database
    const config = await getConfig()
    
    // Find the user by email or userId
    let user = null
    if (userId) {
      user = db.users?.find((u: any) => u.id === userId)
    } else if (email) {
      user = db.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    }
    
    if (!user) {
      // Don't reveal if user exists or not for security
      logger.warn('Account unlock requested for non-existent user', { email, userId })
      return NextResponse.json({ 
        message: 'If an account exists with this email, a security code has been sent.' 
      })
    }
    
    // Check if user has a verified email
    if (!user.email) {
      logger.warn('Account unlock requested for user without email', { userId: user.id })
      return NextResponse.json({ 
        error: 'No email address associated with this account. Please contact your administrator.',
        code: 'NO_EMAIL'
      }, { status: 400 })
    }
    
    // Check if user is actually disabled in Jellyfin
    if (!user.jellyfinId || !config.apiKey) {
      return NextResponse.json({ 
        error: 'Unable to verify account status. Please contact your administrator.',
        code: 'VERIFICATION_FAILED'
      }, { status: 400 })
    }
    
    // Verify user is disabled in Jellyfin
    const jellyfinRes = await fetch(`${config.jellyfinUrl}/Users/${user.jellyfinId}`, {
      headers: { 'X-Emby-Token': config.apiKey }
    })
    
    if (!jellyfinRes.ok) {
      logger.error('Failed to check Jellyfin user status', { userId: user.id, status: jellyfinRes.status })
      return NextResponse.json({ 
        error: 'Unable to verify account status. Please contact your administrator.',
        code: 'VERIFICATION_FAILED'
      }, { status: 500 })
    }
    
    const jellyfinUser = await jellyfinRes.json()
    
    if (!jellyfinUser.Policy?.IsDisabled) {
      logger.info('Account unlock requested but user is not disabled', { userId: user.id })
      return NextResponse.json({ 
        error: 'Your account is not disabled. Please try logging in again.',
        code: 'NOT_DISABLED'
      }, { status: 400 })
    }
    
    // Generate security code and expiration (15 minutes)
    const securityCode = generateSecurityCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    
    // Store the unlock request
    if (!db.accountUnlockRequests) {
      db.accountUnlockRequests = []
    }
    
    // Remove any existing requests for this user
    db.accountUnlockRequests = db.accountUnlockRequests.filter(
      (r: any) => r.userId !== user.id
    )
    
    // Add new request
    db.accountUnlockRequests.push({
      id: crypto.randomUUID(),
      userId: user.id,
      email: user.email,
      code: securityCode,
      expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString()
    })
    
    saveDatabaseImmediate()
    
    // Send email with security code
    const appName = 'JellyConnect'
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Account Unlock Request</h2>
          <p>Hello ${user.displayName || user.jellyfinUsername || 'User'},</p>
          <p>We received a request to unlock your disabled account. Use the security code below to unlock your account:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${securityCode}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 15 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email or contact your administrator if you have concerns.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">This is an automated message from ${appName}.</p>
        </div>
      `
    
    const textContent = `
Account Unlock Request

Hello ${user.displayName || user.jellyfinUsername || 'User'},

We received a request to unlock your disabled account. Use the security code below to unlock your account:

Security Code: ${securityCode}

This code will expire in 15 minutes.

If you did not request this, please ignore this email or contact your administrator if you have concerns.

This is an automated message from ${appName}.
      `
    
    const emailSent = await emailService.sendEmail(
      user.email,
      `${appName} - Account Unlock Security Code`,
      htmlContent,
      textContent
    )
    
    if (!emailSent) {
      logger.error('Failed to send account unlock email', { userId: user.id, email: user.email })
      return NextResponse.json({ 
        error: 'Failed to send security code. Please contact your administrator.',
        code: 'EMAIL_FAILED'
      }, { status: 500 })
    }
    
    logger.info('Account unlock code sent', { userId: user.id, email: user.email })
    
    return NextResponse.json({ 
      message: 'Security code sent to your email address.',
      userId: user.id
    })
    
  } catch (error) {
    logger.error('Account unlock request error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'An error occurred processing your request' }, { status: 500 })
  }
}
