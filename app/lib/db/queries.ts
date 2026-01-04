import { database, saveDatabaseImmediate } from './index';
import { randomBytes } from 'crypto';

// User operations
export function createUser(id: string, jellyfinId: string, email?: string, discordUsername?: string, displayName?: string) {
  const user = {
    id,
    jellyfinId,
    displayName,
    email,
    emailVerified: false,
    discordUsername,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  database.users.push(user);
  return user;
}

export function getUserByJellyfinId(jellyfinId: string) {
  return database.users.find(user => user.jellyfinId === jellyfinId);
}

export function updateUser(id: string, updates: Partial<{
  displayName?: string;
  email: string;
  discordUsername: string;
  expiresAt?: string;
  expiryWarningSent?: boolean;
}>) {
  const user = database.users.find(u => u.id === id);
  if (user) {
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
  }
  return user;
}

export function getUserById(id: string) {
  return database.users.find(u => u.id === id);
}

export function getUserContacts(id: string) {
  const user = getUserById(id);
  if (user) {
    return {
      displayName: user.displayName,
      email: user.email,
      discordUsername: user.discordUsername
    };
  }
  // If user doesn't exist in local database, return empty contacts
  // This handles Jellyfin users that haven't been created through our system yet
  return {
    displayName: null,
    email: null,
    discordUsername: null
  };
}

// Invite operations
export function createInvite(id: string, code: string, createdBy: string, profile: string, maxUses?: number, expiresAt?: string, email?: string) {
  const invite = {
    id,
    code,
    createdBy,
    profile,
    maxUses,
    usedCount: 0,
    expiresAt,
    isActive: true,
    createdAt: new Date().toISOString(),
    email
  };
  database.invites.push(invite);
  return invite;
}

export function getInviteByCode(code: string) {
  console.log('[getInviteByCode] Searching for code:', code, 'in', database.invites.length, 'invites');
  console.log('[getInviteByCode] Invites:', database.invites);
  return database.invites.find(invite => {
    const match = invite.code === code && invite.isActive;
    console.log('[getInviteByCode] Checking invite:', invite.code, 'active:', invite.isActive, 'match:', match);
    return match;
  });
}

export function incrementInviteUsage(id: string) {
  const invite = database.invites.find(i => i.id === id);
  if (invite) {
    invite.usedCount++;
  }
}

export function recordInviteUsage(id: string, inviteId: string, usedBy: string) {
  console.log('[recordInviteUsage] Recording usage - inviteId:', inviteId, 'usedBy:', usedBy);
  
  // Record the usage
  const usage = {
    id,
    inviteId,
    usedBy,
    usedAt: new Date().toISOString()
  };
  database.inviteUsages.push(usage);

  // Increment the invite's usedCount
  const invite = database.invites.find(i => i.id === inviteId);
  console.log('[recordInviteUsage] Found invite:', invite?.code, 'Current usedCount:', invite?.usedCount);
  
  if (invite) {
    invite.usedCount = (invite.usedCount || 0) + 1;
    console.log('[recordInviteUsage] Updated usedCount to:', invite.usedCount);
  } else {
    console.log('[recordInviteUsage] WARNING: Invite not found with id:', inviteId);
  }

  return usage;
}

export function getActiveInvites() {
  return database.invites
    .filter(invite => invite.isActive)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deactivateInvite(id: string) {
  const invite = database.invites.find(i => i.id === id);
  if (invite) {
    invite.isActive = false;
  }
}

export function deleteInvite(id: string) {
  const index = database.invites.findIndex(i => i.id === id);
  if (index !== -1) {
    database.invites.splice(index, 1);
    // Also remove associated usage records
    database.inviteUsages = database.inviteUsages.filter(u => u.inviteId !== id);
  }
}

export function reactivateInvite(id: string) {
  const invite = database.invites.find(i => i.id === id);
  if (invite) {
    invite.isActive = true;
  }
}

export function updateInvite(id: string, updates: Partial<{
  profile: string;
  maxUses: number;
  expiresAt: string;
  isActive: boolean;
}>) {
  const invite = database.invites.find(i => i.id === id);
  if (invite) {
    Object.assign(invite, updates);
  }
}

export function getInviteUsages(inviteId: string) {
  return database.inviteUsages
    .filter(usage => usage.inviteId === inviteId)
    .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime());
}

export function getAllInvites() {
  return database.invites
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function logAudit(id: string, userId: string | undefined, action: string, details?: string, ipAddress?: string, userAgent?: string) {
  const entry = {
    id,
    userId,
    action,
    details,
    ipAddress,
    userAgent,
    createdAt: new Date().toISOString()
  };
  database.auditLog.push(entry);
  return entry;
}

// Notification settings
export function getNotificationSettings(userId: string) {
  return database.notificationSettings.find(setting => setting.userId === userId);
}

export function upsertNotificationSettings(id: string, userId: string, settings: {
  emailEnabled: boolean;
  discordEnabled: boolean;
  welcomeNotifications: boolean;
  expiryWarnings: boolean;
  accountAlerts: boolean;
  systemAlerts: boolean;
}) {
  let existing = database.notificationSettings.find(s => s.id === id);
  if (existing) {
    Object.assign(existing, settings, { updatedAt: new Date().toISOString() });
  } else {
    existing = {
      id,
      userId,
      ...settings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    database.notificationSettings.push(existing);
  }
  return existing;
}

// Account expiry operations
export function setUserExpiry(id: string, expiresAt: string) {
  return updateUser(id, { expiresAt });
}

export function getExpiringUsers(daysAhead: number = 7): Array<{user: any, daysUntilExpiry: number}> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

  return database.users
    .filter(user => user.expiresAt && !user.expiryWarningSent)
    .map(user => {
      const expiryDate = new Date(user.expiresAt!);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      return {
        user,
        daysUntilExpiry
      };
    })
    .filter(({ daysUntilExpiry }) => daysUntilExpiry <= daysAhead && daysUntilExpiry > 0)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

export function getExpiredUsers(): any[] {
  const now = new Date();
  return database.users.filter(user =>
    user.expiresAt && new Date(user.expiresAt) < now
  );
}

export function markExpiryWarningSent(userId: string) {
  return updateUser(userId, { expiryWarningSent: true });
}

export function extendUserExpiry(userId: string, days: number) {
  const user = database.users.find(u => u.id === userId);
  if (!user) return null;

  const currentExpiry = user.expiresAt ? new Date(user.expiresAt) : new Date();
  const newExpiry = new Date(currentExpiry.getTime() + (days * 24 * 60 * 60 * 1000));

  return updateUser(userId, {
    expiresAt: newExpiry.toISOString(),
    expiryWarningSent: false // Reset warning flag when extending
  });
}

// Utility functions
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function generateInviteCode(): string {
  return randomBytes(6).toString('hex').toUpperCase();
}

// Password reset token operations
export function createPasswordResetToken(userId: string, createdBy?: string, expiresInHours: number = 24): string {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000)).toISOString();

  const resetToken = {
    id: generateId(),
    userId,
    token,
    expiresAt,
    used: false,
    createdAt: new Date().toISOString(),
    createdBy
  };

  database.passwordResetTokens.push(resetToken);
  saveDatabaseImmediate();
  return token;
}

export function getPasswordResetToken(token: string) {
  const resetToken = database.passwordResetTokens.find(t => t.token === token && !t.used);
  if (!resetToken) return null;

  // Check if token is expired
  const now = new Date();
  const expiresAt = new Date(resetToken.expiresAt);
  if (now > expiresAt) return null;

  return resetToken;
}

export function markPasswordResetTokenUsed(token: string): boolean {
  const resetToken = database.passwordResetTokens.find(t => t.token === token);
  if (resetToken && !resetToken.used) {
    resetToken.used = true;
    saveDatabaseImmediate();
    return true;
  }
  return false;
}

export function cleanupExpiredPasswordResetTokens(): number {
  const now = new Date();
  const initialCount = database.passwordResetTokens.length;
  database.passwordResetTokens = database.passwordResetTokens.filter(token => {
    const expiresAt = new Date(token.expiresAt);
    return expiresAt > now;
  });
  return initialCount - database.passwordResetTokens.length;
}