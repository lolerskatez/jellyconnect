/**
 * Maps OIDC groups to Jellyfin user policies and roles.
 * Supports three role levels: Administrator, Power User, and User
 */

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
 * Customize this mapping based on your OIDC provider's group names
 * 
 * Supported group names (case-insensitive):
 * - Administrator: "Administrator", "Administrators", "Admin", "Admins"
 * - Power User: "Power User", "Power Users", "PowerUser", "PowerUsers"
 * - User: "User", "Users" (default fallback)
 */
export function mapGroupsToRole(groups: string[] | string | undefined): JellyfinRole {
  if (!groups) {
    return 'user'; // Default to user if no groups
  }

  const groupArray = Array.isArray(groups) ? groups : [groups];
  const normalizedGroups = groupArray.map(g => g.toLowerCase().trim().replace(/\s+/g, ''));

  console.log('[GROUP MAPPING] Input groups:', groupArray);
  console.log('[GROUP MAPPING] Normalized groups:', normalizedGroups);

  // Check for administrator groups (highest priority)
  // Matches: "Administrator", "Administrators", "Admin", "Admins"
  if (normalizedGroups.some(g => 
    g === 'administrator' || 
    g === 'administrators' ||
    g === 'admin' ||
    g === 'admins'
  )) {
    console.log('[GROUP MAPPING] Mapped to: admin');
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
    console.log('[GROUP MAPPING] Mapped to: powerUser');
    return 'powerUser';
  }

  // Default to user
  console.log('[GROUP MAPPING] Mapped to: user (default)');
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
