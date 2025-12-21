# Troubleshooting Guide

## SSO/OIDC Authentication Issues

### Issue: Login redirects to localhost instead of configured domain

**Symptoms:**
- After clicking "Sign in with SSO", you're redirected to `http://localhost:3000/...` instead of your actual domain
- Session cookies aren't being stored
- 401 errors from `/api/auth/session`

**Root Cause:**
The OIDC callback handler uses `req.url` which resolves to `localhost` on the server, even if you're accessing via a different domain.

**Solution:**
Ensure `NEXTAUTH_URL` environment variable is set correctly in `.env.local`:

```env
NEXTAUTH_URL=http://192.168.1.125:3000
# or for production
NEXTAUTH_URL=https://your-domain.com
```

The application uses this URL for all redirects after OIDC authentication.

---

### Issue: Session cookie not being sent to API

**Symptoms:**
- `/api/auth/session` returns 401 (Unauthorized)
- Server logs show `[SESSION] Token from cookie: missing`
- User stays logged out even after OIDC flow completes

**Root Cause:**
The browser won't send httpOnly cookies unless the fetch request includes `credentials: 'include'`.

**Solution:**
Check that fetch calls to `/api/auth/session` include the credentials option:

```typescript
const response = await fetch('/api/auth/session', {
  credentials: 'include',  // Required to send cookies
})
```

This is already fixed in:
- `app/auth/callback/complete/page.tsx`
- `app/providers.tsx`

---

### Issue: Token verification fails with 401

**Symptoms:**
- Server log shows `[SESSION] Token verification failed - payload is null`
- User is authenticated but session doesn't work
- Session token is present but invalid

**Root Cause:**
The `NEXTAUTH_SECRET` is empty or doesn't match between token creation and verification.

**Solution:**
Ensure `NEXTAUTH_SECRET` is set and consistent:

```env
# .env.local
NEXTAUTH_SECRET=your-random-secret-here
```

Generate a secure random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:** This must be the same value used when creating tokens in `app/lib/auth.ts`.

---

### Issue: OIDC provider returns "invalid redirect_uri"

**Symptoms:**
- Authentik/Keycloak error: "Redirect URI mismatch"
- Cannot complete OIDC flow
- Provider login redirects back with error

**Root Cause:**
The redirect URI registered in your OIDC provider doesn't match what JellyConnect is sending.

**Solution:**
1. Check your OIDC provider configuration (Authentik, Keycloak, etc.)
2. The redirect URI should be: `{NEXTAUTH_URL}/api/auth/callback/oidc`
3. Examples:
   - Local: `http://192.168.1.125:3000/api/auth/callback/oidc`
   - Production: `https://your-domain.com/api/auth/callback/oidc`

---

### Issue: Logout doesn't clear session

**Symptoms:**
- After clicking logout, refreshing the page still shows logged in
- User can access protected routes after logout
- Session persists even though localStorage is cleared

**Root Cause:**
The httpOnly session cookie wasn't being cleared, allowing the session to persist.

**Solution:**
Ensure the logout endpoint clears the cookie. This is handled by `app/api/auth/logout/route.ts`, which is called by the logout function in `app/providers.tsx`.

If you customized the logout function, make sure it calls:
```typescript
const logout = async () => {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
  // ... rest of cleanup
}
```

---

## Environment Variable Issues

### Issue: Configuration not applying after changes

**Symptoms:**
- Changes to `.env.local` don't take effect
- Dev server still uses old configuration
- OIDC settings not updating

**Solution:**
Restart the development server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

Environment variables are loaded at server startup.

---

### Issue: Missing or incorrect OIDC provider details

**Symptoms:**
- Error: "No OIDC provider configured"
- Provider settings not loading
- Cannot see provider on login page

**Solution:**
1. Go to Settings → Authentication in the admin panel
2. Verify all provider fields are filled:
   - Provider Name (display name)
   - Client ID
   - Client Secret
   - Issuer URL
3. Click "Test Provider" to verify configuration
4. Restart the server

---

## Database Issues

### Issue: OIDC user auto-creation fails

**Symptoms:**
- Error during OIDC callback: "Failed to create Jellyfin user"
- User exists in OIDC provider but not in JellyConnect
- Callback returns error instead of logging in

**Root Cause:**
JellyConnect requires a valid Jellyfin server connection to auto-create users.

**Solution:**
1. Verify Jellyfin server is running and accessible
2. Check `JELLYFIN_SERVER_URL` in configuration
3. Verify the API key in `config.json` is valid
4. Check Jellyfin server logs for user creation errors

---

## Browser Issues

### Issue: Cookies not persisting across page reloads

**Symptoms:**
- Session works during OIDC flow
- Refreshing the page logs you out
- Cookies appear in DevTools but aren't sent in requests

**Solution:**
1. Open Browser DevTools (F12)
2. Go to Application → Cookies
3. Verify `next-auth.session-token` cookie exists
4. Check cookie properties:
   - Domain: Should match your access domain (e.g., `192.168.1.125`)
   - Path: Should be `/`
   - HttpOnly: Should be `☑️` (checked)
   - Secure: Should be `☑️` only in production (HTTPS)
   - SameSite: Should be `Lax`

5. If cookie is missing, check Network tab:
   - Find the OIDC callback request
   - Response Headers should contain `Set-Cookie: next-auth.session-token=...`

---

## Testing & Debugging

### Enable verbose logging

Add these to your code temporarily for debugging:

```typescript
// In app/lib/auth.ts or relevant files
console.log('[DEBUG] Environment:', {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***' : 'NOT SET',
})

// In OIDC callback
console.log('[OIDC] Request URL:', req.url)
console.log('[OIDC] Base URL:', baseUrl)
console.log('[OIDC] Redirect URI:', redirectUri)
```

### Test JWT token creation/verification

```bash
node -e "
const jwt = require('jsonwebtoken');
const SECRET = process.env.NEXTAUTH_SECRET;

if (!SECRET) {
  console.error('NEXTAUTH_SECRET not set');
  process.exit(1);
}

const token = jwt.sign({ test: 'data' }, SECRET, { expiresIn: '1h' });
console.log('Token created:', token.substring(0, 50) + '...');

const verified = jwt.verify(token, SECRET);
console.log('Token verified:', verified);
"
```

### Check OIDC provider endpoints

```bash
# Test if provider is accessible
curl https://your-oidc-provider/application/o/your-app/.well-known/openid-configuration
```

This should return provider configuration including token and userinfo endpoints.

---

## Getting Help

When reporting issues, include:
1. Error message and full stack trace
2. Server logs (especially `[OIDC CALLBACK]`, `[SESSION]`, `[AUTH]` lines)
3. Browser console errors (F12 → Console)
4. Network requests (F12 → Network tab, filter for API calls)
5. `.env.local` (with secrets redacted)
6. Your OIDC provider configuration (with secrets redacted)

