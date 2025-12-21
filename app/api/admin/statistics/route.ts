import { NextResponse } from 'next/server'
import { database } from '@/app/lib/db'
import { getConfig } from '@/app/lib/config'

export async function GET() {
  try {
    const config = getConfig()
    
    // Get user statistics from local database
    const totalLocalUsers = database.users.length
    const usersWithExpiry = database.users.filter(u => u.expiresAt).length
    
    // Calculate expiring soon (within 7 days)
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const expiringSoon = database.users.filter(u => {
      if (!u.expiresAt) return false
      const expiryDate = new Date(u.expiresAt)
      return expiryDate > now && expiryDate <= sevenDaysFromNow
    }).length
    
    // Get expired users
    const expiredUsers = database.users.filter(u => {
      if (!u.expiresAt) return false
      return new Date(u.expiresAt) < now
    }).length
    
    // Get invite statistics
    const activeInvites = database.invites.filter(i => i.isActive).length
    const totalInvites = database.invites.length
    const totalInviteUsages = database.inviteUsages.length
    
    // Try to get Jellyfin user count
    let jellyfinUserCount = 0
    let jellyfinConnected = false
    
    if (config.jellyfinUrl && config.apiKey) {
      try {
        const response = await fetch(`${config.jellyfinUrl}/Users`, {
          headers: {
            'X-Emby-Token': config.apiKey,
          },
        })
        if (response.ok) {
          const users = await response.json()
          jellyfinUserCount = users.length
          jellyfinConnected = true
        }
      } catch (error) {
        console.error('[STATISTICS] Failed to fetch Jellyfin users:', error)
      }
    }
    
    // Get notification settings count
    const usersWithNotifications = database.notificationSettings.length
    
    // Calculate OIDC users
    const oidcUsers = database.users.filter(u => u.oidcProvider).length
    
    return NextResponse.json({
      users: {
        total: totalLocalUsers,
        jellyfin: jellyfinUserCount,
        withExpiry: usersWithExpiry,
        expiringSoon,
        expired: expiredUsers,
        oidc: oidcUsers,
      },
      invites: {
        active: activeInvites,
        total: totalInvites,
        usages: totalInviteUsages,
      },
      notifications: {
        usersConfigured: usersWithNotifications,
      },
      system: {
        jellyfinConnected,
        databaseUsers: totalLocalUsers,
      }
    })
  } catch (error) {
    console.error('[STATISTICS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
