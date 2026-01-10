# Jellyfin API Connection Diagnosis Summary

## What I've Found

Your codebase has proper error handling in place, but the actual errors you're experiencing depend on your specific configuration. I've identified the key integration points and created tools to help diagnose the issue.

---

## The Problem

When you have a valid API key installed but something isn't working right, it could be one of these issues:

### 1. **Network/Connectivity Issues**
- Jellyfin server is not running
- URL is incorrect or unreachable
- Firewall is blocking connections
- Docker networking misconfiguration

### 2. **Authentication Issues**
- API key is invalid (wrong format, truncated, or revoked)
- API key was generated for a different server
- API key has expired or been revoked
- Wrong Authorization header format

### 3. **Configuration Issues**
- URL not saved in settings
- Whitespace before/after URL or key
- URL format incorrect (missing protocol or port)
- Wrong port being used

### 4. **API Endpoint Issues**
- Jellyfin API requires different headers
- Server expects different request format
- HTTPS required but HTTP being used
- API version mismatch

---

## Diagnostic Tools Created

I've added powerful diagnostic endpoints to help identify the exact problem:

### 1. **Full Jellyfin Connection Diagnostics**
```bash
curl http://localhost:3100/api/debug/jellyfin-connection
```

This tests:
- ✅ Configuration validity
- ✅ Network connectivity
- ✅ API authentication
- ✅ User endpoint access
- ✅ Server information retrieval
- ✅ Provides specific remediation steps

**Example response:**
```json
{
  "summary": {
    "overallStatus": "FAILED",
    "passed": 1,
    "failed": 2,
    "recommendations": [
      "Verify Jellyfin server is running and accessible at the configured URL",
      "Generate a new API key in Jellyfin Admin Dashboard > API Keys"
    ]
  },
  "tests": [
    {
      "name": "Configuration Check",
      "status": "OK",
      "message": "URL configured: http://jellyfin.example.com:8096"
    },
    {
      "name": "Network Connectivity",
      "status": "FAILED",
      "error": "ECONNREFUSED",
      "hint": "Connection refused - Jellyfin server may not be running or URL is incorrect"
    },
    {
      "name": "API Authentication",
      "status": "FAILED",
      "error": "HTTP 401 Unauthorized",
      "hint": "API key is invalid or has been revoked. Please generate a new API key."
    }
  ]
}
```

### 2. **Enhanced Error Messages**
I've improved the `/api/users` endpoint to provide:
- Specific error types (connection vs authentication vs not found)
- Helpful hints for each error
- Detailed logging with partial API key visibility (first 8 chars)
- Connection timeout handling

---

## How to Diagnose Your Issue

### Step 1: Run Full Diagnostics
```bash
curl http://localhost:3100/api/debug/jellyfin-connection
```

Look at the `summary.overallStatus` and `recommendations` fields.

### Step 2: Check Each Test Result

**If "Configuration Check" failed:**
- URL or API key is not configured
- Go to Admin Settings and verify configuration is saved

**If "Network Connectivity" failed:**
- Check the error message
  - `ECONNREFUSED`: Server not running or URL wrong
  - `ENOTFOUND`: Hostname invalid
  - `timeout`: Network unreachable
- Verify URL format: `http://host:8096` (with protocol and port)
- For Docker: Use service name, not localhost

**If "API Authentication" failed:**
- Status 401: API key is invalid
  - Generate new key in Jellyfin Admin → API Keys
  - Ensure full key is copied (40+ chars)
- Status 403: API key exists but lacks permissions
- Other status: Check Jellyfin logs

**If "User List Endpoint" failed:**
- Previous tests passed but this fails
- Check Jellyfin API documentation
- May indicate API version incompatibility

### Step 3: Test with curl

```bash
# Test network connectivity
curl -I http://jellyfin.example.com:8096

# Test API authentication
curl -H "X-Emby-Token: YOUR_FULL_API_KEY_HERE" \
  http://jellyfin.example.com:8096/System/Info

# Test user endpoint
curl -H "X-Emby-Token: YOUR_FULL_API_KEY_HERE" \
  http://jellyfin.example.com:8096/Users
```

Each should return HTTP 200 with JSON data.

---

## Common Solutions

### 🔴 **API Key Invalid (HTTP 401)**
```bash
# In Jellyfin Admin Dashboard:
1. Go to Dashboard → Settings → API Keys
2. Delete the old key
3. Click "+" to create new key
4. Copy the ENTIRE key (don't truncate)
5. Go to JellyConnect Admin → Settings
6. Paste the full key (check for trailing spaces)
7. Save and test
```

### 🔴 **Connection Refused**
```bash
# For Docker:
- Use `http://jellyfin:8096` (service name)
- NOT `http://localhost:8096`

# For local network:
- Use `http://192.168.1.100:8096` (IP address)
- Verify firewall allows port 8096

# Verify server is running:
docker ps | grep jellyfin
# Should show jellyfin container running
```

### 🔴 **Host Not Found**
```bash
# Verify hostname resolution:
ping jellyfin.example.com
nslookup jellyfin.example.com

# Or use IP instead:
http://192.168.1.100:8096
```

### 🔴 **Connection Timeout**
```bash
# Check if server is slow:
curl -v http://jellyfin.example.com:8096

# Verify network path:
tracert jellyfin.example.com  # Windows
traceroute jellyfin.example.com  # Linux

# Try from same machine:
curl http://localhost:8096
```

---

## Code Changes Made

### 1. **New Debug Endpoint**
- File: `app/api/debug/jellyfin-connection/route.ts`
- Comprehensive diagnostics with specific error hints
- Generates actionable recommendations
- Tests multiple connection aspects

### 2. **Enhanced Error Handling**
- File: `app/api/users/route.ts`
- Better error messages
- Connection timeout protection
- Specific remediation hints
- Improved logging

### 3. **Troubleshooting Documentation**
- File: `JELLYFIN_API_TROUBLESHOOTING.md`
- Comprehensive guide for all common issues
- curl command examples
- Configuration checklist

---

## Verification Checklist

Once you've fixed the issue, verify with:

```bash
# 1. Full diagnostics should show all tests passing
curl http://localhost:3100/api/debug/jellyfin-connection
# Expected: "overallStatus": "OK"

# 2. Users endpoint should work
curl http://localhost:3100/api/users
# Expected: JSON array of users

# 3. Try the web interface
# Login and check Admin → Users
# Should display Jellyfin users without errors
```

---

## Next Steps

1. **Run diagnostics** and identify which test is failing
2. **Follow the specific recommendation** from the diagnostics output
3. **Verify with curl** that the endpoint works
4. **Check JellyConnect logs** for any remaining errors:
   ```bash
   docker logs jellyconnect 2>&1 | grep -i "jellyfin\|error\|auth"
   ```
5. **Check Jellyfin logs** for API errors:
   - Jellyfin Admin → Logs
   - Look for "JellyConnect" or API errors

---

## Need More Help?

The diagnostic endpoint provides:
- Exact error messages from Jellyfin
- HTTP status codes
- Response times
- Server information
- Specific remediation hints

Run it again after making changes to confirm the fix worked.
