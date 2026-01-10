# QuickConnect Session Cookie Fix

## Problem
The QuickConnect authorization endpoint returns `401 (Unauthorized)` with error "Not authenticated - please log in first" even after logging in.

**Root Cause:** The NextAuth session cookie is not being sent with requests to `/api/quickconnect/authorize`.

## Why This Happens

NextAuth requires the `NEXTAUTH_URL` environment variable to be properly configured. This variable tells NextAuth:
1. What domain/URL it's running on
2. What domain to set the session cookie for
3. How to validate callback URLs

**Without `NEXTAUTH_URL`, NextAuth cannot properly set or validate cookies.**

## Solution

### Step 1: Set NEXTAUTH_URL in Your Production Environment

You **must** set the `NEXTAUTH_URL` environment variable to your application's public URL:

```bash
NEXTAUTH_URL=https://jc.tanjiro.one
```

### Step 2: Verify NEXTAUTH_SECRET is Set

Also ensure `NEXTAUTH_SECRET` is configured (this should already be set):

```bash
NEXTAUTH_SECRET=your-random-secret-here-change-this-in-production
```

### Step 3: Restart Your Application

After setting the environment variables, restart the application for the changes to take effect.

## How It Works

Once `NEXTAUTH_URL` is properly configured:

1. **User logs in** → NextAuth sets `next-auth.session-token` cookie for `jc.tanjiro.one`
2. **User clicks "Authorize QuickConnect"** → Browser sends the cookie along with the request
3. **Endpoint receives cookie** → Session is validated and QuickConnect authorization succeeds

## Testing

To verify the fix is working:

1. Log in to the system (you should see the session cookie in browser DevTools)
2. Open QuickConnect authorization modal
3. Enter a QuickConnect code
4. Click Authorize
5. Should see success message instead of 401 error

## Debugging

If you still see `401` errors after setting `NEXTAUTH_URL`, check:

1. **Browser DevTools** → Network tab → `/api/quickconnect/authorize` request
   - Look for `Cookie` header in the request
   - It should contain `next-auth.session-token=...`

2. **Server logs** should show:
   - Without fix: `"No session cookie found - user must be logged in first"`
   - With fix: `"Attempting to authorize Quick Connect code"` (with userId details)

3. **Verify NEXTAUTH_URL matches your actual domain:**
   - For `https://jc.tanjiro.one/` → set `NEXTAUTH_URL=https://jc.tanjiro.one`
   - Include protocol but no trailing slash after domain

## Environment Configuration Examples

### Docker/Docker-Compose
```yaml
environment:
  - NEXTAUTH_URL=https://jc.tanjiro.one
  - NEXTAUTH_SECRET=your-secret-here
  - JELLYFIN_SERVER_URL=http://your-jellyfin:8096
```

### Kubernetes
```yaml
env:
  - name: NEXTAUTH_URL
    value: "https://jc.tanjiro.one"
  - name: NEXTAUTH_SECRET
    valueFrom:
      secretKeyRef:
        name: jellyconnect-secrets
        key: nextauth-secret
```

### systemd/Manual Deployment
```bash
export NEXTAUTH_URL=https://jc.tanjiro.one
export NEXTAUTH_SECRET=your-secret-here
npm start
```

## Security Notes

- **NEVER** commit actual secrets to git
- Use environment variables or secret management for production
- The cookie will only be sent over HTTPS in production (secure flag automatically enabled)
- Cookie is httpOnly, preventing XSS attacks
- Cookie uses sameSite=lax for CSRF protection
