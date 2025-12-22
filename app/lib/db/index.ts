import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'jellyconnect-data.json');

// Database structure
interface Database {
  users: User[];
  invites: Invite[];
  inviteUsages: InviteUsage[];
  auditLog: AuditEntry[];
  notificationSettings: NotificationSetting[];
  authSettings: AuthSettings[];
  scheduledTasks: ScheduledTask[];
}

interface User {
  id: string;
  jellyfinId: string;
  jellyfinUsername?: string; // Username in Jellyfin (distinct from display name)
  displayName?: string; // Display name (optional, defaults to Jellyfin username)
  email?: string;
  emailVerified?: boolean;
  discordUsername?: string; // Discord username for DM notifications
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // Account expiry date
  expiryWarningSent?: boolean; // Track if expiry warning was sent
  // OIDC fields
  oidcProvider?: string; // e.g., 'authentik', 'keycloak', 'gitea', 'vaultwarden'
  oidcProviderId?: string; // User ID from OIDC provider
  oidcGroups?: string[]; // Groups/roles from OIDC provider
  // Encrypted Jellyfin credentials for SSO users (used for QuickConnect authorization)
  jellyfinPasswordEncrypted?: string; // Encrypted Jellyfin password
}

interface Invite {
  id: string;
  code: string;
  createdBy: string;
  profile: string;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  email?: string; // Optional email to pre-fill registration
}

interface InviteUsage {
  id: string;
  inviteId: string;
  usedBy: string;
  usedAt: string;
}

interface AuditEntry {
  id: string;
  userId?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface NotificationSetting {
  id: string;
  userId: string;
  // Channel toggles
  emailEnabled: boolean;
  discordEnabled: boolean;
  // Notification type preferences
  welcomeNotifications: boolean;
  expiryWarnings: boolean;
  accountAlerts: boolean;
  systemAlerts: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthSettings {
  id: string;
  // Password auth
  passwordAuthEnabled: boolean;
  // Generic OIDC settings
  oidcEnabled: boolean;
  forceOIDC: boolean; // If true, disable password auth entirely
  // Custom OIDC provider configuration
  oidcProviderName?: string; // User-friendly name (e.g., "Authentik", "Keycloak")
  oidcDiscoveryUrl?: string; // OpenID Discovery URL
  oidcClientId?: string; // OIDC Client ID
  oidcClientSecret?: string; // OIDC Client Secret
  // Explicit endpoint configuration (optional, falls back to discovery)
  oidcAuthorizationEndpoint?: string;
  oidcTokenEndpoint?: string;
  oidcUserinfoEndpoint?: string;
  updatedAt: string;
}

interface ScheduledTask {
  id: string;
  taskType: string;
  targetId: string;
  executeAt: string;
  data?: any;
  completed: boolean;
  createdAt: string;
}

// Initialize database
function loadDatabase(): Database {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Ensure all required arrays exist
      const db: Database = {
        users: parsed.users || [],
        invites: parsed.invites || [],
        inviteUsages: parsed.inviteUsages || [],
        auditLog: parsed.auditLog || [],
        notificationSettings: parsed.notificationSettings || [],
        authSettings: parsed.authSettings || [],
        scheduledTasks: parsed.scheduledTasks || []
      };
      
      return db;
    }
  } catch (error) {
    console.error('Failed to load database:', error);
  }
  // Return empty database structure
  return {
    users: [],
    invites: [],
    inviteUsages: [],
    auditLog: [],
    notificationSettings: [],
    authSettings: [],
    scheduledTasks: []
  };
}

function saveDatabase(db: Database): void {
  try {
    const jsonData = JSON.stringify(db, null, 2)
    fs.writeFileSync(DB_PATH, jsonData)
  } catch (error) {
    console.error('Failed to save database:', error)
  }
}

// In-memory database instance
let database = loadDatabase();

// Save database periodically (every 30 seconds)
const saveInterval = setInterval(() => {
  saveDatabase(database);
}, 30000);

// Export function to trigger immediate save
export function saveDatabaseImmediate(): void {
  saveDatabase(database);
}

// Save on process exit
process.on('exit', () => saveDatabase(database));
process.on('SIGINT', () => {
  saveDatabase(database);
  process.exit();
});

export { database };
export type { Database, User, Invite, InviteUsage, AuditEntry, NotificationSetting, AuthSettings, ScheduledTask };