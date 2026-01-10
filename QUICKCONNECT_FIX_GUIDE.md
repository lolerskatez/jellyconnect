# Quick Start: Fix QuickConnect 401 Error

## The Problem
You're getting `401 (Unauthorized)` error when trying to authorize QuickConnect codes, with message "Not authenticated - please log in first"

## The Root Cause
The application doesn't know what URL it's being accessed from, so NextAuth can't properly set session cookies.

## The Solution (3 Steps)

### Step 1: Access Settings
1. Go to Admin Panel → **Settings**
2. Click the **General** tab
3. Scroll down to find **"NextAuth URL (NEXTAUTH_URL)"** field

### Step 2: Enter Your Public URL
In the field, enter your application's public URL exactly as you access it:

**Example:** If you access the app at `https://jc.tanjiro.one`, enter exactly that.

```
https://jc.tanjiro.one
```

**Important:**
- ✅ Include protocol (`https://` or `http://`)
- ✅ Match your exact public URL
- ❌ No trailing slash after domain
- ❌ Don't include `/login` or other paths

### Step 3: Save and Test
1. Click **"Save General Settings"** button
2. Wait for success message
3. Log in to the application again (to ensure fresh session)
4. Try QuickConnect authorization again
5. Should now work! ✅

## Expected Behavior After Fix

**Before Fix:**
- Click "Authorize QuickConnect" button
- Enter code
- Get error: "Not authenticated - please log in first"
- Session cookie not being sent

**After Fix:**
- Click "Authorize QuickConnect" button
- Enter code
- Get success: "Session approved! You can now use Jellyfin in the other tab."
- Session working properly ✅

## If It Still Doesn't Work

1. **Check the URL you entered** - Make sure it exactly matches what's in your browser's address bar
2. **Clear browser cookies** - Sometimes old cookies interfere
3. **Log in again** - Get a fresh session with the correct domain
4. **Check browser console** - Look for any CORS or cookie errors
5. **Server logs** - Check application logs for clues

## Why This Works

When you set the NextAuth URL:
1. NextAuth knows what domain to set cookies for
2. Browser sends the session cookie with your requests
3. Server receives the cookie and validates your session
4. QuickConnect authorization succeeds ✅

## For Production Deployment

If deploying to a server:
1. Set `NEXTAUTH_URL` environment variable before starting
2. Or use Settings UI to configure it (persists in database)
3. Environment variable takes precedence if both are set

Example environment variable:
```bash
export NEXTAUTH_URL=https://jc.tanjiro.one
npm start
```

Or in Docker:
```yaml
environment:
  NEXTAUTH_URL: https://jc.tanjiro.one
  NEXTAUTH_SECRET: your-secret-here
```
