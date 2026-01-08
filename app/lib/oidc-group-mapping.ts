/**
 * Maps OIDC groups to Jellyfin user policies and roles.
 * Supports three role levels: Administrator, Power User, and User
 */

import { authLogger } from './logger';

export type JellyfinRole = 'admin' | 'powerUser' | 'user';

export interface UserPolicy {
  IsAdministrator: boolean;
  IsHidden: boolean;
  IsDisabled: boolean;
  EnableCollectionManagement: boolean;
  EnableSubtitleManagement: boolean;
  EnableLyricManagement: boolean;
  EnableContentDeletion: boolean;
  EnableContentDeletionFromFolders: any[];
  EnableContentDownloading: boolean;
  EnableMediaPlayback: boolean;
  EnableAudioPlaybackTranscoding: boolean;
  EnableVideoPlaybackTranscoding: boolean;
  EnablePlaybackRemuxing: boolean;
  EnableAllFolders: boolean;
  EnableAllChannels: boolean;
  EnableAllDevices: boolean;
  EnableRemoteAccess: boolean;
  EnableLiveTvAccess: boolean;
  EnableLiveTvManagement?: boolean;
  EnablePublicSharing: boolean;
  EnableSyncTranscoding: boolean;
  EnableMediaConversion: boolean;
  MaxParentalRating: any;
  BlockUnratedItems: any[];
  BlockedTags: any[];
  AllowedTags: any[];
  EnableUserPreferenceAccess: boolean;
  AccessSchedules: any[];
  InvalidLoginAttemptCount: number;
  LoginAttemptsBeforeLockout: number;
  MaxActiveSessions: number;
  RemoteClientBitrateLimit: number;
  SyncPlayAccess: string;
  EnableRemoteControlOfOtherUsers?: boolean;
  EnableSharedDeviceControl?: boolean;
  ForceRemoteSourceTranscoding?: boolean;
  PasswordResetProviderId?: string;
  AuthenticationProviderId?: string;
}

// Role presets - matching the ones from UserDetailPageClient.tsx
const ROLE_POLICIES: Record<JellyfinRole, UserPolicy> = {
  user: {
    IsAdministrator: false,
    IsHidden: false,
    IsDisabled: false,
    EnableCollectionManagement: false,
    EnableSubtitleManagement: false,
    EnableLyricManagement: false,
    EnableContentDeletion: false,
    EnableContentDeletionFromFolders: [],
    EnableContentDownloading: true,
    EnableMediaPlayback: true,
    EnableAudioPlaybackTranscoding: true,
    EnableVideoPlaybackTranscoding: true,
    EnablePlaybackRemuxing: true,
    EnableAllFolders: true,
    EnableAllChannels: true,
    EnableAllDevices: true,
    EnableRemoteAccess: true,
    EnableLiveTvAccess: true,
    EnablePublicSharing: false,
    EnableSyncTranscoding: false,
    EnableMediaConversion: false,
    MaxParentalRating: null,
    BlockUnratedItems: [],
    BlockedTags: [],
    AllowedTags: [],
    EnableUserPreferenceAccess: true,
    AccessSchedules: [],
    InvalidLoginAttemptCount: 0,
    LoginAttemptsBeforeLockout: 0,
    MaxActiveSessions: 0,
    RemoteClientBitrateLimit: 0,
    SyncPlayAccess: 'None',
    PasswordResetProviderId: '',
    AuthenticationProviderId: ''
  },
  powerUser: {
    IsAdministrator: false,
    IsHidden: false,
    IsDisabled: false,
    EnableCollectionManagement: true,
    EnableSubtitleManagement: true,
    EnableLyricManagement: true,
    EnableContentDeletion: true,
    EnableContentDeletionFromFolders: [],
    EnableContentDownloading: true,
    EnableMediaPlayback: true,
    EnableAudioPlaybackTranscoding: true,
    EnableVideoPlaybackTranscoding: true,
    EnablePlaybackRemuxing: true,
    EnableAllFolders: true,
    EnableAllChannels: true,
    EnableAllDevices: true,
    EnableRemoteAccess: true,
    EnableLiveTvAccess: true,
    EnableLiveTvManagement: false,
    EnablePublicSharing: true,
    EnableSyncTranscoding: true,
    EnableMediaConversion: true,
    MaxParentalRating: null,
    BlockUnratedItems: [],
    BlockedTags: [],
    AllowedTags: [],
    EnableUserPreferenceAccess: true,
    AccessSchedules: [],
    InvalidLoginAttemptCount: 0,
    LoginAttemptsBeforeLockout: 0,
    MaxActiveSessions: 0,
    RemoteClientBitrateLimit: 0,
    SyncPlayAccess: 'JoinGroups',
    PasswordResetProviderId: '',
    AuthenticationProviderId: ''
  },
  admin: {
    IsAdministrator: true,
    IsHidden: false,
    IsDisabled: false,
    EnableCollectionManagement: true,
    EnableSubtitleManagement: true,
    EnableLyricManagement: true,
    EnableContentDeletion: true,
    EnableContentDeletionFromFolders: [],
    EnableContentDownloading: true,
    EnableMediaPlayback: true,
    EnableAudioPlaybackTranscoding: true,
    EnableVideoPlaybackTranscoding: true,
    EnablePlaybackRemuxing: true,
    ForceRemoteSourceTranscoding: true,
    EnableAllFolders: true,
    EnableAllChannels: true,
    EnableAllDevices: true,
    EnableRemoteAccess: true,
    EnableLiveTvManagement: true,
    EnableLiveTvAccess: true,
    EnableRemoteControlOfOtherUsers: true,
    EnableSharedDeviceControl: true,
    EnablePublicSharing: true,
    EnableSyncTranscoding: true,
    EnableMediaConversion: true,
    MaxParentalRating: null,
    BlockUnratedItems: [],
    BlockedTags: [],
    AllowedTags: [],
    EnableUserPreferenceAccess: true,
    AccessSchedules: [],
    InvalidLoginAttemptCount: 0,
    LoginAttemptsBeforeLockout: 0,
    MaxActiveSessions: 0,
    RemoteClientBitrateLimit: 0,
    SyncPlayAccess: 'CreateAndJoinGroups',
    PasswordResetProviderId: '',
    AuthenticationProviderId: ''
  }
};

/**
 * Maps OIDC groups to Jellyfin roles
 * Uses configurable mappings from database, falls back to default patterns if not configured
 */
export function mapGroupsToRole(groups: string[] | string | undefined): JellyfinRole {
  if (!groups) {
    return 'user'; // Default to user if no groups
  }

  const groupArray = Array.isArray(groups) ? groups : [groups];
  const normalizedGroups = groupArray.map(g => g.toLowerCase().trim().replace(/\s+/g, ''));

  authLogger.debug('OIDC group mapping input', { inputGroups: groupArray, normalizedGroups });

  // Try to get configured mappings from database
  try {
    const { getAuthSettings } = require('./auth-settings');
    const authSettings = getAuthSettings();

    // Check admin groups first (highest priority)
    if (authSettings.oidcAdminGroups && authSettings.oidcAdminGroups.length > 0) {
      const configuredAdminGroups = authSettings.oidcAdminGroups.map((g: string) => g.toLowerCase().trim().replace(/\s+/g, ''));
      if (normalizedGroups.some(g => configuredAdminGroups.includes(g))) {
        authLogger.debug('OIDC group mapped to admin role (configured)');
        return 'admin';
      }
    }

    // Check power user groups (medium priority)
    if (authSettings.oidcPowerUserGroups && authSettings.oidcPowerUserGroups.length > 0) {
      const configuredPowerUserGroups = authSettings.oidcPowerUserGroups.map((g: string) => g.toLowerCase().trim().replace(/\s+/g, ''));
      if (normalizedGroups.some(g => configuredPowerUserGroups.includes(g))) {
        authLogger.debug('OIDC group mapped to powerUser role (configured)');
        return 'powerUser';
      }
    }

    // Check user groups (lowest priority, explicit configuration)
    if (authSettings.oidcUserGroups && authSettings.oidcUserGroups.length > 0) {
      const configuredUserGroups = authSettings.oidcUserGroups.map((g: string) => g.toLowerCase().trim().replace(/\s+/g, ''));
      if (normalizedGroups.some(g => configuredUserGroups.includes(g))) {
        authLogger.debug('OIDC group mapped to user role (configured)');
        return 'user';
      }
    }
  } catch (error) {
    authLogger.warn('Failed to load auth settings for group mapping, using defaults', { error: error instanceof Error ? error.message : String(error) });
  }

  // Fallback to default patterns if no configuration or error
  // Check for administrator groups (highest priority)
  // Matches: "Administrator", "Administrators", "Admin", "Admins"
  if (normalizedGroups.some(g =>
    g === 'administrator' ||
    g === 'administrators' ||
    g === 'admin' ||
    g === 'admins'
  )) {
    authLogger.debug('OIDC group mapped to admin role (fallback)');
    return 'admin';
  }

  // Check for power user groups (medium priority)
  // Matches: "Power User", "Power Users", "PowerUser", "PowerUsers"
  if (normalizedGroups.some(g =>
    g === 'poweruser' ||
    g === 'powerusers' ||
    g === 'power-user' ||
    g === 'power-users' ||
    g === 'power_user' ||
    g === 'power_users'
  )) {
    authLogger.debug('OIDC group mapped to powerUser role (fallback)');
    return 'powerUser';
  }

  // Default to user
  authLogger.debug('OIDC group mapped to user role (default)');
  return 'user';
}

/**
 * Gets the Jellyfin policy for a given role
 */
export function getRolePolicyForJellyfin(role: JellyfinRole): UserPolicy {
  return ROLE_POLICIES[role];
}

/**
 * Gets the role for a policy (reverse lookup)
 * Useful for determining which role a user currently has
 */
export function getPolicyRole(policy: Partial<UserPolicy>): JellyfinRole {
  if (policy.IsAdministrator) return 'admin';
  if (policy.EnableContentDeletion && policy.EnableAllFolders) return 'powerUser';
  return 'user';
}
