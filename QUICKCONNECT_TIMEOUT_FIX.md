# QuickConnect Timeout and Debugging Fixes

**Issue Reported:** `POST https://jc.tanjiro.one/api/quickconnect/authorize 401 (Unauthorized)`

**Root Cause:** 
1. Missing timeout on Jellyfin API calls in quickconnect endpoints (could cause hanging requests)
2. Insufficient debug logging to identify session/authentication failures
3. No visibility into which fallback method is being attempted

**Fixes Applied:**

## 1. Added 10-Second Timeouts to All QuickConnect Endpoints

### File: [app/api/quickconnect/authorize/route.ts](app/api/quickconnect/authorize/route.ts)

**Updated Methods:**
- ✅ User authentication fetch (line 56) - Added `signal: AbortSignal.timeout(10000)`
- ✅ QuickConnect authorize with user token (line 75) - Added timeout
- ✅ Fallback 1: userId parameter approach (line 104) - Added timeout
- ✅ Fallback 2: X-Emby-Authorization header approach (line 126) - Added timeout
- ✅ Fallback 3: Admin API key approach (line 149) - Added timeout

### File: [app/api/quickconnect/initiate/route.ts](app/api/quickconnect/initiate/route.ts)

**Updated Methods:**
- ✅ Initiate quickconnect session (line 7) - Added `signal: AbortSignal.timeout(10000)`

### File: [app/api/quickconnect/poll/route.ts](app/api/quickconnect/poll/route.ts)

**Updated Methods:**
- ✅ Poll quickconnect status (line 20) - Added `signal: AbortSignal.timeout(10000)`

## 2. Enhanced Debug Logging in Authorize Endpoint

**Added Cookie Debugging:**
```typescript
// Log all cookies for debugging
const allCookies = request.cookies.getSetCookie()
const cookies = request.cookies.getAll()
quickConnectLogger.debug('Available cookies', { 
  cookieNames: cookies.map(c => c.name), 
  cookieCount: cookies.length 
})
```

**Better Session Cookie Detection:**
- Now logs available cookie names when session cookie is not found
- Helps identify if session token is using different name than expected

**Enhanced Payload Verification:**
```typescript
if (!payload || !payload.jellyfinId) {
  quickConnectLogger.warn('Session verification failed or no Jellyfin ID in payload', { 
    hasPayload: !!payload, 
    hasJellyfinId: !!payload?.jellyfinId 
  })
  return NextResponse.json({ error: 'Invalid session or no Jellyfin user linked' }, { status: 401 })
}
```

**Config Validation Logging:**
```typescript
if (!config.jellyfinUrl || !config.apiKey) {
  quickConnectLogger.error('Jellyfin not configured', { 
    hasUrl: !!config.jellyfinUrl, 
    hasApiKey: !!config.apiKey,
    apiKeyLength: config.apiKey?.length || 0  // Now shows if API key is truncated!
  })
  return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
}
```

## 3. Session Cookie Cookie Names Being Checked

The authorize endpoint now checks these cookie names in order:
1. `next-auth.session-token` (default)
2. `__Secure-next-auth.session-token` (production/HTTPS)

If neither exists, logs show which cookies ARE available, making it easy to identify if NextAuth is using a different cookie name.

## 4. What This Fixes

✅ **Hanging Requests:** 10-second timeout prevents requests from hanging indefinitely  
✅ **401 Errors:** Better logging shows exactly where the 401 is coming from:
   - Is the session cookie missing? → Logs available cookies
   - Is the session invalid? → Logs hasPayload and hasJellyfinId status
   - Is the API key truncated? → Logs actual apiKeyLength
   - Is it the Jellyfin server? → Each fallback method logs its status

✅ **Debugging:** Server logs now clearly show:
   - Which cookies are present on the request
   - Why session verification failed (if it did)
   - API key length (indicating if it's truncated)
   - Which fallback method was used (existing logging)

## 5. Troubleshooting 401 Errors

When you see `401 (Unauthorized)` in the browser, check logs for:

1. **"No session cookie found"** → User is not logged in
   - Check if session cookie name matches your NextAuth configuration
   - Verify HTTPS/HTTP cookie settings match deployment

2. **"Session verification failed"** → Session token is invalid
   - Token may be expired
   - Token may be corrupted
   - Verify session secret is consistent

3. **"apiKeyLength: 0"** → API key is empty/not configured
   - Verify Jellyfin API key is set in environment/config

4. **"apiKeyLength: < 32"** → API key is truncated
   - This indicates the same issue we fixed in JellyfinAuth
   - API key should be 32+ characters

## 6. Related Fixes

This is complementary to the earlier **Jellyfin API Fix** which replaced SDK `axiosInstance` calls with native `fetch`. The quickconnect endpoints were already using native `fetch`, but were missing timeouts.

## Files Modified

- [app/api/quickconnect/authorize/route.ts](app/api/quickconnect/authorize/route.ts) - Added 5 timeouts + debug logging
- [app/api/quickconnect/initiate/route.ts](app/api/quickconnect/initiate/route.ts) - Added 1 timeout
- [app/api/quickconnect/poll/route.ts](app/api/quickconnect/poll/route.ts) - Added 1 timeout

**Total Changes:** 7 timeout additions + enhanced debugging
**Status:** ✅ Complete
