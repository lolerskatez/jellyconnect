# NextAuth URL Configuration - Settings UI

## What Was Added

A new configuration field has been added to **Settings > General** tab to manage the critical `NEXTAUTH_URL` setting directly from the UI.

### UI Changes

**Location:** Admin Panel → Settings → General Tab

**New Field:**
- **NextAuth URL (NEXTAUTH_URL)** - Text input field for the public URL of your application

**Features:**
- URL validation (must be valid HTTPS URL)
- Helpful hint text explaining why this is critical
- Example placeholder: `https://jc.tanjiro.one`
- Saved to the config database along with other settings

### Configuration Storage

The NextAuth URL is now stored in:
- **Database:** `data/config.json` (persisted setting)
- **API:** `/api/settings` endpoint supports getting and setting this value
- **Environment:** Can still be set via `NEXTAUTH_URL` environment variable (takes precedence)

### Files Modified

1. **app/lib/config.ts**
   - Added `nextAuthUrl?: string` to Config interface
   - Added `nextAuthUrl` to default config reading from `process.env.NEXTAUTH_URL`
   - Updated `getConfig()` to include nextAuthUrl

2. **app/api/settings/route.ts**
   - Updated GET endpoint to return `nextAuthUrl`
   - Updated PUT endpoint to accept and save `nextAuthUrl`

3. **app/lib/validation.ts**
   - Added URL validation for `nextAuthUrl` in `updateSettingsSchema`

4. **app/admin/settings/page.tsx**
   - Added `nextAuthUrl` to Settings interface
   - Added state management for `nextAuthUrl`
   - Added `updateNextAuthUrl()` handler
   - Updated `saveGeneralSettings()` to save nextAuthUrl via settings API
   - Added UI field with helpful documentation in General tab

## How to Use

### Setting it up:

1. Log in as an administrator
2. Navigate to **Settings** (Admin Panel)
3. Go to the **General** tab
4. Find the **"NextAuth URL (NEXTAUTH_URL)"** field
5. Enter your public application URL (e.g., `https://jc.tanjiro.one`)
6. Click **"Save General Settings"**

### Important Requirements:

- Must include protocol: `https://` or `http://`
- Must match your actual public URL exactly
- **No trailing slash** after domain
- Invalid URLs will be rejected with validation error

### Testing QuickConnect After Setup:

1. Set the NextAuth URL to your public domain
2. Log in to the application (should see session cookie set)
3. Try QuickConnect authorization
4. Should succeed instead of returning 401 error

## Technical Details

### How NextAuth Uses This Setting:

When a user logs in:
1. NextAuth checks `NEXTAUTH_URL` to determine the cookie domain
2. Sets `next-auth.session-token` cookie for that domain
3. Browser sends cookie with all subsequent requests to same domain

For QuickConnect to work:
1. User must be logged in (session cookie exists)
2. Browser must send the cookie when calling `/api/quickconnect/authorize`
3. Server validates the session and proceeds with authorization

### Priority Order:

Environment variables take precedence over database config:
1. `NEXTAUTH_URL` environment variable (if set) - highest priority
2. NextAuth URL from Settings/Config database
3. Empty string (session cookies won't work)

## Security Notes

- This is a non-sensitive configuration setting (it's the public URL, not a secret)
- Can be changed at any time without affecting existing sessions
- Changes take effect immediately
- Users don't need to re-login if this is updated

## Troubleshooting

**Problem:** Still getting "Not authenticated" on QuickConnect after setting the URL

**Solutions:**
1. Verify URL matches your exact public domain (check browser address bar)
2. Check for typos or extra spaces
3. Ensure it includes protocol (`https://`)
4. Ensure there's NO trailing slash
5. Restart the application for environment variable changes
6. Clear browser cookies and log in again

**Example Valid URLs:**
- ✅ `https://jc.tanjiro.one`
- ✅ `https://jellyconnect.example.com`
- ✅ `http://localhost:3000` (for development)

**Example Invalid URLs:**
- ❌ `jc.tanjiro.one` (missing protocol)
- ❌ `https://jc.tanjiro.one/` (has trailing slash)
- ❌ `https://jc.tanjiro.one:443` (port in public URL usually wrong)
- ❌ `http://192.168.1.100:3000` (internal IP instead of public domain)
