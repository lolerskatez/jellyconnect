# Jellyfin API Key Validation Guide

## The Issue

Your debug output shows:
```
status: "FAILED"
apiKeyValid: false
message: "Jellyfin API key validation failed"
```

This means the API key is being sent correctly but Jellyfin is rejecting it. Here's how to fix it.

---

## Understanding Jellyfin API Authentication

According to [Jellyfin API Documentation](https://api.jellyfin.org/), there are multiple ways to authenticate:

### 1. **API Key (X-Emby-Token Header)** - Recommended
```
GET /System/Info HTTP/1.1
Host: jellyfin.example.com:8096
X-Emby-Token: your_api_key_here
Accept: application/json
```

### 2. **User Session Token**
Created by authenticating with username/password

### 3. **Authorization Header**
For older API versions or special cases

---

## Why Your API Key Validation Failed

### ✅ Things That Are Correct:
- Configuration is loaded
- URL is correct: `http://192.168.1.183:8096`
- API key is configured: `3ccbc6aedd...`
- Connection to server works (you're getting responses)

### ❌ What's Wrong:
- Server is returning an error to the `/System/Info` endpoint
- Likely causes:
  1. **API key doesn't exist or was deleted in Jellyfin**
  2. **API key is malformed or corrupted**
  3. **API key has different permissions/scope**
  4. **Jellyfin server version incompatibility**

---

## Step-by-Step Fix

### Step 1: Verify the API Key Format

The API key from Jellyfin should be:
- ✅ 40+ characters long
- ✅ Hexadecimal format (numbers and a-f only)
- ✅ No spaces or special characters
- ✅ No newlines or whitespace

Check what you have:
```bash
curl http://localhost:3100/api/debug/api-key-test
```

Look for `apiKeyLength` and `apiKeyPrefix`. Should be 40+ characters.

### Step 2: Delete and Recreate the API Key

**In Jellyfin Admin Panel:**

1. Go to **Dashboard** → **Settings** → **API Keys**
2. Find the key for "JellyConnect"
3. Click the **trash icon** to delete it
4. Click the **plus icon** to create a new key
5. Set the application name to: `JellyConnect`
6. Copy the **entire key** (don't truncate)
7. Paste it into a text editor to verify it's complete

**Key characteristics:**
- Should look like: `3ccbc6aedd1234567890abcdef1234567890abcd`
- 40 characters, all hexadecimal
- No spaces before or after

### Step 3: Update JellyConnect Configuration

1. In JellyConnect, go to **Admin** → **Settings**
2. Find the **Jellyfin API Key** field
3. Delete the old value completely
4. Paste the new key from Step 2
5. **Verify no leading/trailing spaces**
6. Click **Save**

### Step 4: Test the New Key

```bash
# Quick test
curl http://localhost:3100/api/debug/api-key-test

# Or full diagnostics
curl http://localhost:3100/api/debug/jellyfin-connection
```

Expected response if successful:
```json
{
  "valid": true,
  "serverInfo": {
    "serverName": "MyJellyfin",
    "version": "10.8.13"
  }
}
```

---

## Manual Testing with curl

If the endpoints still don't work, test directly with curl:

```bash
# Replace YOUR_API_KEY with the actual key
curl -H "X-Emby-Token: YOUR_API_KEY" \
  http://192.168.1.183:8096/System/Info

# You should get JSON with server info
# If you get empty response or error, the key is invalid
```

### Expected Successful Response:
```json
{
  "ServerName": "MyJellyfin",
  "Version": "10.8.13",
  "OperatingSystem": "Linux",
  ...
}
```

### Common Failure Responses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```
→ API key is invalid or doesn't exist

**Empty response:**
→ Server is not accepting the key

**HTML error page:**
→ Wrong endpoint or server misconfiguration

---

## Troubleshooting Checklist

- [ ] **API Key exists in Jellyfin**
  - Go to Jellyfin Admin → API Keys
  - Should show at least one key
  - Verify the key is active (not disabled)

- [ ] **API Key is complete**
  - Not truncated (40+ characters)
  - No whitespace before/after
  - All characters are hex (0-9, a-f)

- [ ] **Key format is correct**
  - No dashes or special characters
  - No copy-paste artifacts
  - Not URL-encoded (no %20, etc)

- [ ] **Configuration is saved**
  - In JellyConnect, paste the key
  - Click Save
  - Refresh the page to verify it's still there

- [ ] **Server is accessible**
  - Can reach `http://192.168.1.183:8096` from JellyConnect
  - Server responds to requests
  - No firewall blocking

- [ ] **Jellyfin is running**
  - Check Jellyfin logs for errors
  - Verify no recent crashes or restarts
  - Check available disk space

---

## Advanced: Check Jellyfin API Key Status

You can also check the API key status directly in Jellyfin:

```bash
# First, authenticate with username/password to get a session token
curl -X POST http://192.168.1.183:8096/Users/AuthenticateByName \
  -H "Content-Type: application/json" \
  -d '{
    "Username": "admin",
    "Pw": "your_admin_password"
  }'

# This returns a response with "AccessToken" 
# Use that token to check API keys:
curl http://192.168.1.183:8096/Auth/Keys \
  -H "X-Emby-Token: ACCESS_TOKEN_FROM_ABOVE"
```

This will show all registered API keys and their details.

---

## If Still Not Working

1. **Check Jellyfin Server Logs:**
   - Jellyfin Admin Panel → Logs
   - Look for errors related to authentication or API

2. **Verify Network:**
   ```bash
   # From JellyConnect container/machine
   curl -v http://192.168.1.183:8096/System/Info
   # Should get HTTP 200 or 401 (not timeout or connection refused)
   ```

3. **Check Server Version:**
   - Jellyfin compatibility issues sometimes prevent API key auth
   - Try upgrading to latest stable version

4. **Try with User Session:**
   - Instead of API key, authenticate with username/password
   - Create a session token
   - Use that for testing

5. **Check API Key Permissions:**
   - In Jellyfin, verify the API key has sufficient permissions
   - All JellyConnect features require "Admin" or full permissions

---

## Reference

- **Jellyfin API Docs:** https://api.jellyfin.org/
- **API Key Endpoint:** `GET /Auth/Keys` (requires admin)
- **System Info Endpoint:** `GET /System/Info` (requires valid auth)
- **Default Jellyfin Port:** 8096 (HTTP) or 8920 (HTTPS)

---

## Quick Reference: API Key Authentication

**Method:** `GET` or `POST`
**Header:** `X-Emby-Token: YOUR_API_KEY`
**Example:**
```bash
curl -H "X-Emby-Token: 3ccbc6aeddxxxxxxxxxxxxxxxxxxxxxxxx" \
  http://192.168.1.183:8096/System/Info
```

**Response:** HTTP 200 with JSON server info, or HTTP 401/403 if key invalid
