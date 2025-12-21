import jwt from 'jsonwebtoken';

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user'
}

export interface UserPermissions {
  canManageUsers: boolean;
  canManageInvites: boolean;
  canViewSettings: boolean;
  canManageNotifications: boolean;
  canViewReports: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.ADMIN]: {
    canManageUsers: true,
    canManageInvites: true,
    canViewSettings: true,
    canManageNotifications: true,
    canViewReports: true
  },
  [UserRole.MODERATOR]: {
    canManageUsers: false,
    canManageInvites: true,
    canViewSettings: false,
    canManageNotifications: true,
    canViewReports: true
  },
  [UserRole.USER]: {
    canManageUsers: false,
    canManageInvites: false,
    canViewSettings: false,
    canManageNotifications: false,
    canViewReports: false
  }
};

export function getRolePermissions(role: UserRole): UserPermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[UserRole.USER];
}

// Get secure secret key - prioritize environment variable
function getSecretKey(): string {
  // First try environment variable (most secure)
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  
  // Then try config (for flexibility)
  try {
    const { getConfig } = require('./config');
    const config = getConfig();
    if (config.nextAuthSecret) {
      return config.nextAuthSecret;
    }
  } catch (e) {
    // Config not available yet
  }
  
  // In production, fail if no secret is configured
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET environment variable must be set in production!');
  }
  
  // Development fallback - log warning
  console.warn('[AUTH] WARNING: Using development fallback secret. Set NEXTAUTH_SECRET for production!');
  return 'dev-fallback-secret-not-for-production';
}

// Server-side only functions
export async function createAccessToken(data: any): Promise<string> {
  const SECRET_KEY = getSecretKey();
  return jwt.sign(data, SECRET_KEY, { expiresIn: '1h' });
}

export async function verifyAccessToken(token: string): Promise<any> {
  try {
    const SECRET_KEY = getSecretKey();
    const payload = jwt.verify(token, SECRET_KEY);
    console.log('[AUTH] Token verified successfully');
    return payload;
  } catch (error) {
    console.error('[AUTH] Token verification error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}