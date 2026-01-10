# Quick API Key Debugging Guide

## Your Situation
- Jellyfin URL: `http://192.168.1.183:8096` ✅ (configured correctly)
- API Key: `3ccbc6aedd...` ✅ (configured)
- **Issue:** API key validation is failing

---

## Use These Debug Endpoints

### 1. **Comprehensive API Key Validator** (Best option)
```bash
curl http://localhost:3100/api/debug/validate-api-key
```

**This endpoint:**
- ✅ Analyzes your API key format
- ✅ Tests server reachability
- ✅ Tests authentication
- ✅ Provides specific issues found
- ✅ Gives step-by-step recommendations

**Look for:**
```json
{
  "validation": {
    "formatValid": true/false,
    "serverReachable": true/false,
    "authenticationValid": true/false,
    "overallValid": true/false
  },
  "issues": ["List of specific problems"],
  "recommendations": ["Step-by-step fixes"]
}
```

### 2. **Quick API Key Test**
```bash
curl http://localhost:3100/api/debug/api-key-test
```

**This endpoint:**
- Quick validation of the key
- Shows server info if valid
- Identifies error type

### 3. **Full Connection Diagnostics**
```bash
curl http://localhost:3100/api/debug/jellyfin-connection
```

**This endpoint:**
- Tests configuration
- Tests connectivity
- Tests authentication
- Tests user endpoint
- Provides recommendations

---

## What the Errors Mean

### ❌ `apiKey.format.isValid = false`
**Problem:** API key format is wrong

**Check:**
- Length is 40+ characters
- No spaces before/after
- Only hexadecimal (0-9, a-f)
- No dashes or underscores

**Fix:**
1. Go to Jellyfin Admin → API Keys
2. Create new key
3. Copy the **entire** key
4. Paste in JellyConnect (no truncation)

---

### ❌ `validation.serverReachable = false`
**Problem:** Can't reach Jellyfin server

**Likely causes:**
- Server is offline
- URL is incorrect
- Firewall blocking port 8096
- Docker networking issue

**Fix:**
1. Verify Jellyfin is running
2. Check URL format (need `http://` and port)
3. For Docker: use service name, not localhost
4. Verify firewall allows port 8096

---

### ❌ `validation.authenticationValid = false`
**Problem:** Server rejects the API key

**HTTP Status codes:**
- **401 Unauthorized:** Key is invalid or revoked
- **403 Forbidden:** Key exists but lacks permissions
- **Other:** Server error or key malformed

**Fix:**
1. Delete old API key in Jellyfin
2. Create new API key
3. Copy full key (40 chars minimum)
4. Update JellyConnect
5. Save and test

---

## Step-by-Step Troubleshooting

### Step 1: Run the validator
```bash
curl http://localhost:3100/api/debug/validate-api-key
```

### Step 2: Check the results
- Read the `issues` array
- Read the `recommendations` array
- Follow the specific suggestions

### Step 3: Fix the identified issue

**If format issue:**
- Ensure key is 40+ characters
- No spaces
- Only hex characters

**If server unreachable:**
- Check Jellyfin is running
- Verify URL and port
- Check firewall

**If authentication fails:**
- Generate new API key in Jellyfin
- Copy the entire key
- Update JellyConnect config

### Step 4: Test again
```bash
curl http://localhost:3100/api/debug/validate-api-key
# Should show overallValid: true
```

---

## Common Issues & Quick Fixes

| Issue | Sign | Fix |
|-------|------|-----|
| **Truncated key** | `length < 40` | Copy full key from Jellyfin |
| **Spaces in key** | Key has leading/trailing spaces | Delete and re-paste without spaces |
| **Invalid chars** | Contains `-, _, spaces` | Generate new key |
| **Server offline** | `ECONNREFUSED` | Start Jellyfin server |
| **Wrong URL** | `ENOTFOUND` | Check hostname/IP |
| **Revoked key** | `HTTP 401` | Create new key in Jellyfin |
| **Permission denied** | `HTTP 403` | Re-generate key, ensure full permissions |

---

## Jellyfin Admin Steps

To create/fix API key:

1. **Login to Jellyfin**
   - URL: `http://192.168.1.183:8096`
   - User: admin
   - Password: your admin password

2. **Navigate to API Keys**
   - Click Dashboard (top-left menu)
   - Click Settings (gear icon)
   - Click "API Keys" in left sidebar

3. **Create New Key**
   - Click the **+** (plus) button
   - Application name: `JellyConnect`
   - Click Create
   - **Copy the entire key** (don't truncate)

4. **Verify Key**
   - Should be exactly 40 hexadecimal characters
   - Example: `3ccbc6aeddxxxxxxxxxxxxxxxxxxxxxxxx`

5. **Update JellyConnect**
   - Go to JellyConnect Admin → Settings
   - Paste the key (no spaces)
   - Save
   - Test with debug endpoint

---

## Testing with curl

If endpoints don't work, test directly:

```bash
# Test 1: Can you reach the server?
curl -I http://192.168.1.183:8096

# Test 2: Is the API key valid?
curl -H "X-Emby-Token: YOUR_FULL_API_KEY" \
  http://192.168.1.183:8096/System/Info

# Expected response (HTTP 200 with JSON):
# {
#   "ServerName": "...",
#   "Version": "...",
#   ...
# }

# If you get HTTP 401 or 403, the key is invalid
# If no response or timeout, server is unreachable
```

---

## Debug Endpoint Summary

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/api/debug/validate-api-key` | Full analysis + recommendations | Detailed issues and fixes |
| `/api/debug/api-key-test` | Quick validation | Valid/invalid status |
| `/api/debug/jellyfin-connection` | All tests | Config, connectivity, auth |

---

## Next Steps

1. **Run:** `curl http://localhost:3100/api/debug/validate-api-key`
2. **Read** the `issues` and `recommendations` fields
3. **Fix** the identified problem
4. **Re-run** to verify it's fixed
5. **Check** that `overallValid` is now `true`

That's it! Your Jellyfin API connection should work after that.
