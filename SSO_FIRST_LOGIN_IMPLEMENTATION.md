## SSO First-Time User Creation Feature

### Overview

When a user logs in with SSO (OIDC) for the first time, the system automatically:

1. **Creates a Jellyfin Account** with:
   - A secure, randomized username (generated from email)
   - A strong, randomly-generated password (for security, users won't need this as they login via SSO)
   - Appropriate access level based on OIDC group membership

2. **Stores User Data** locally including:
   - Email address
   - Jellyfin ID and username
   - OIDC provider and groups
   - Account creation timestamp

3. **Maps OIDC Groups to Jellyfin Roles**:
   - **Administrators** → Full admin access to Jellyfin
   - **Power Users** → Advanced access (delete content, manage collections)
   - **Users** → Basic access (play media)

### Implementation Details

#### New Files Created

##### `app/lib/secure-password.ts`
Provides secure password generation for Jellyfin accounts:
- `generateSecurePassword()`: Creates a 32-character password with mixed character types
- `generateSecureUsername()`: Creates a safe username from email

```typescript
import { generateSecurePassword, generateSecureUsername } from '@/app/lib/secure-password'

const password = generateSecurePassword() // -> "aB3!xY9@kL2#mN5$..."
const username = generateSecureUsername('user@example.com') // -> "user_a7b8c9"
```

##### `app/lib/oidc-group-mapping.ts`
Maps OIDC group claims to Jellyfin roles with complete policy definitions:
- `mapGroupsToRole()`: Maps OIDC groups to roles (admin/powerUser/user)
- `getRolePolicyForJellyfin()`: Gets the complete policy object for a role
- `getPolicyRole()`: Reverse lookup to determine role from policy

```typescript
import { mapGroupsToRole, getRolePolicyForJellyfin } from '@/app/lib/oidc-group-mapping'

const role = mapGroupsToRole(['admin']) // -> 'admin'
const policy = getRolePolicyForJellyfin(role) // -> Full admin policy
```

**Group Matching Logic:**
- Groups are matched case-insensitively
- Administrator: Contains "admin" or "administrator"
- Power User: Contains "power" or "poweruser"
- User: Default role if no admin/power user groups found

#### Updated Files

##### `auth.ts` - Enhanced Authentication
- Imports the new security utilities
- Updated `autoCreateJellyfinUser()` function:
  - Generates secure credentials
  - Extracts OIDC groups from profile
  - Maps groups to Jellyfin roles
  - Applies role-based policies to newly created users
  - Stores groups in local database for future reference

- Updated `signIn` callback:
  - Passes OIDC groups to user creation
  - Updates groups on subsequent logins (in case they change)
  - Supports multiple group claim names: `groups`, `roles`, `oidc_groups`

##### `app/lib/db/index.ts` - Database Schema
Added fields to `User` interface:
- `jellyfinUsername`: The actual username created in Jellyfin
- `oidcGroups`: Array of groups from OIDC provider for auditing/role sync

##### `app/lib/jellyfin.ts` - Enhanced Jellyfin API
Added new method `createSSOUser()`:
```typescript
async createSSOUser(
  username: string,
  email: string,
  role: JellyfinRole = 'user'
): Promise<{ userId: string; username: string; password: string }>
```

This method:
- Generates a secure password
- Creates the user in Jellyfin
- Applies the appropriate role policy
- Returns all necessary information

### Configuration

#### OIDC Provider Configuration

Ensure your OIDC provider sends group information in the user info endpoint. The system looks for:
- `groups` claim
- `roles` claim  
- `oidc_groups` claim

**Example with Authentik:**
```json
{
  "sub": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "groups": ["admin", "group1"],
  "roles": []
}
```

**Example with Keycloak:**
```json
{
  "sub": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "groups": ["/administrators"],
  "realm_access": {
    "roles": ["admin"]
  }
}
```

### Jellyfin Access Levels

#### Administrator
- Full server administration
- User management
- Library management
- Remote access control
- Transcoding management

#### Power User
- Content deletion
- Collection management
- Subtitle/lyric management
- Public sharing
- Advanced library access

#### User
- Media playback
- Content downloading
- Library browsing
- No deletion/management capabilities

### Security Notes

1. **Password Generation**: Passwords are cryptographically random and never shown to users
2. **Password Storage**: Never stored in local database - only kept in Jellyfin
3. **Group Updates**: Groups are refreshed on each login to keep roles in sync
4. **OIDC Validation**: All OIDC authentication flows are validated by NextAuth.js

### Customizing Group Mappings

To customize group to role mappings, edit `mapGroupsToRole()` in `app/lib/oidc-group-mapping.ts`:

```typescript
export function mapGroupsToRole(groups: string[] | string | undefined): JellyfinRole {
  if (!groups) return 'user'

  const groupArray = Array.isArray(groups) ? groups : [groups]
  const normalized = groupArray.map(g => g.toLowerCase().trim())

  // Custom mapping logic
  if (normalized.some(g => g === 'my-admin-group')) return 'admin'
  if (normalized.some(g => g === 'my-power-group')) return 'powerUser'

  return 'user'
}
```

### Troubleshooting

#### User creation fails
- Check Jellyfin is running and configured correctly
- Verify API key is valid
- Check logs for Jellyfin connection errors

#### Groups not being recognized
- Verify OIDC provider is sending groups in `groups`, `roles`, or `oidc_groups` claim
- Check browser dev tools to see actual profile data returned
- Update `mapGroupsToRole()` if using different claim names

#### Wrong role applied
- Check OIDC provider group names match mapping logic (case-insensitive)
- Verify group claim is being sent by OIDC provider
- Check browser console logs for group mapping debug info

### Testing

Test the flow by:
1. Setting up OIDC provider with test users in different groups
2. Logging in as test user with admin group
3. Verify user created in Jellyfin with admin policy
4. Check user details in Jellyfin to confirm role
5. Repeat for power user and regular user groups

Check logs for SSO creation details:
- `[OIDC] Creating new Jellyfin user...` - Start of creation
- `[OIDC] User created successfully...` - Creation succeeded
- `[JELLYFIN] SSO user created successfully...` - Full details logged
