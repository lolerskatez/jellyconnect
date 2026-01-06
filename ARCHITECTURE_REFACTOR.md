# JellyConnect Architecture Refactor - Single Service Model

## Summary of Changes

The codebase has been successfully refactored from a **dual-service architecture** (separate admin and public portals on ports 3010/3020) to a **single unified service** on port 3100 with role-based user experience differentiation.

---

## What Was Removed

### 1. **Dual-Port Configuration**
- ❌ Removed `ADMIN_PORT=3010` and `PUBLIC_PORT=3020` environment variables
- ❌ Removed APP_MODE environment variable detection
- ❌ Removed port-based service detection logic

### 2. **Hardcoded Domain Detection**
- ❌ Removed hardcoded `x-forwarded-host` set to `c.tanjiro.one` in middleware
- ❌ Removed hostname-based route detection (c. prefix for public vs admin)
- ❌ Removed duplicate reverse proxy configurations for two domains

### 3. **Dual-Service Route Detection**
- ❌ Removed app mode detection from all components:
  - `app/login/page.tsx` - Removed port/hostname detection
  - `app/register/page.tsx` - Removed port/hostname detection
  - `app/components/Navigation.tsx` - Removed appMode state
  - `app/providers.tsx` - Removed admin-only access requirement based on appMode

### 4. **Deprecated Next.js Configuration**
- ❌ Removed `publicRuntimeConfig` and `NEXT_PUBLIC_APP_MODE` references
- ❌ Removed conditional port configuration based on APP_MODE
- ❌ Cleaned up allowedDevOrigins to single port

---

## What Was Restored/Fixed

### 1. **NextAuth Session Endpoint**
**File**: `app/api/auth/session/route.ts`

```typescript
// NOW: Properly uses NextAuth's getServerSession
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user: session.user })
}
```

**Fixed Issues**:
- ✅ Returns proper 401 when no session instead of placeholder
- ✅ Integrates with NextAuth properly
- ✅ Validates sessions against JWT tokens in cookies

### 2. **Single Service Port Configuration**
**Files Updated**:
- `.env.local` - Changed NEXTAUTH_URL to `http://localhost:3100`
- `package.json` - Updated dev script to `-p 3100`
- `next.config.js` - Simplified port configuration
- `middleware.ts` - Removed hardcoded host override

### 3. **Role-Based Navigation**
**File**: `app/components/Navigation.tsx`

Now properly shows different UI based on user role:
- ✅ **Standard Users**: See profile, settings, notifications
- ✅ **Admins**: See full admin dashboard with:
  - Users management
  - Invites management
  - System settings
  - Admin tools

---

## Architecture

### Single Service Model

```
                          Port 3100
                            |
                 ┌──────────┴──────────┐
                 |                     |
          SSO Login                Jellyfin Auth
          (OIDC)                    (Local)
                 |                     |
                 └──────────┬──────────┘
                            |
                    ┌───────┴──────────┐
                    |                  |
              User (Role: USER)    Admin (Role: ADMIN)
                    |                  |
          ┌─────────┘                  │
          |                            │
     Standard UI              Admin Dashboard UI
     - Profile                - Dashboard
     - Settings               - Users
     - Notifications          - Invites
     - Change Password        - Settings

```

### User Experience Differentiation

The application uses **role-based access control** instead of separate services:

| Feature | Standard User | Admin User |
|---------|---------------|-----------|
| Login | ✅ SSO/Local | ✅ SSO/Local |
| Profile Management | ✅ | ✅ |
| Settings | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| User Management | ❌ | ✅ |
| Invite Management | ❌ | ✅ |
| Admin Settings | ❌ | ✅ |
| Jellyfin Admin Functions | ❌ | ✅ |

---

## Environment Configuration

### Before (Dual-Service)
```env
APP_MODE=admin
ADMIN_PORT=3010
PUBLIC_PORT=3020
NEXTAUTH_URL=https://admin.yourdomain.com
```

### After (Single Service)
```env
PORT=3100
NEXTAUTH_URL=http://localhost:3100  # or https://yourdomain.com in production
NEXTAUTH_SECRET=your-secret
```

---

## Deployment Changes

### Docker Configuration
**Single Container** instead of two:

```yaml
services:
  jellyconnect:
    build: .
    ports:
      - "3100:3100"
    environment:
      - PORT=3100
      - NEXTAUTH_URL=https://yourdomain.com
      - JELLYFIN_SERVER_URL=http://jellyfin:8096
```

### Nginx Reverse Proxy
**Single domain** instead of two:

```nginx
server {
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3100;
    }
}
```

---

## Key Files Changed

| File | Changes |
|------|---------|
| `.env.local` | Updated port to 3100, removed APP_MODE |
| `package.json` | Updated dev script to port 3100 |
| `next.config.js` | Simplified port configuration |
| `middleware.ts` | Removed hardcoded host override |
| `app/api/auth/session/route.ts` | Fixed to use getServerSession properly |
| `app/components/Navigation.tsx` | Uses role-based UI instead of port detection |
| `app/login/page.tsx` | Removed port/hostname detection |
| `app/register/page.tsx` | Removed port/hostname detection |
| `app/providers.tsx` | Removed admin-only access enforcement |

---

## Testing Checklist

- [x] Removed all dual-service references
- [x] Updated environment configuration for single port
- [x] Fixed NextAuth session endpoint
- [x] Restored role-based UI differentiation
- [x] Server runs on port 3100
- [ ] Test SSO login flow
- [ ] Test local user login
- [ ] Test admin dashboard access
- [ ] Test standard user limitations
- [ ] Test role-based navigation visibility
- [ ] Test Docker deployment

---

## Benefits

1. **Simplified Deployment**: One service instead of two
2. **Unified Codebase**: No need to maintain dual configurations
3. **Easier Reverse Proxy Setup**: Single domain/port
4. **Better Performance**: Less overhead
5. **Clear Role-Based Access**: User role determines features
6. **Scalable**: Easy to add more roles in the future

---

## Migration from Dual to Single Service

If you were running the old dual-service setup:

1. **Stop** the old services (port 3010 and 3020)
2. **Update** your reverse proxy (if applicable)
3. **Update** your OIDC provider callback URL to single domain
4. **Update** your `.env.local` file to use single port
5. **Run** `npm run dev` or `docker-compose up`
6. **Test** both admin and standard user login flows

---

## Notes

- All Jellyfin operations remain the same
- SSO/OIDC integration is unchanged
- Database and data persistence unchanged
- Notification system unchanged
- All admin features are still available to admin users

The refactoring maintains all functionality while significantly simplifying the deployment and operational complexity.
