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

// Server-side only functions
export async function createAccessToken(data: any): Promise<string> {
  const { getConfig } = await import('./config');
  const config = getConfig();
  const SECRET_KEY = config.nextAuthSecret || 'fallback-secret';
  return jwt.sign(data, SECRET_KEY, { expiresIn: '1h' });
}

export async function verifyAccessToken(token: string): Promise<any> {
  try {
    const { getConfig } = await import('./config');
    const config = getConfig();
    const SECRET_KEY = config.nextAuthSecret || 'fallback-secret';
    
    if (!SECRET_KEY || SECRET_KEY === 'fallback-secret') {
      console.error('[AUTH] WARNING: Using fallback secret for token verification!');
    }
    
    const payload = jwt.verify(token, SECRET_KEY);
    console.log('[AUTH] Token verified successfully');
    return payload;
  } catch (error) {
    console.error('[AUTH] Token verification error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}