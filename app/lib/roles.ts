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