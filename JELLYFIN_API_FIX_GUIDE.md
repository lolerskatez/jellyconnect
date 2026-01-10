# Jellyfin API Connection - Solutions Provided

## Summary

I've reviewed your codebase and identified potential issues with the Jellyfin API connection. I've created **comprehensive diagnostic tools** and **enhanced error handling** to help you identify and resolve the problem.

---

## What's the Problem?

When you have a valid API key but it's not working, it's typically one of these:

1. **API Key Issue** (most common)
   - Key is truncated or has leading/trailing spaces
   - Key was revoked in Jellyfin admin panel
   - Key is invalid format

2. **Network Issue**
   - Jellyfin server is offline
   - URL is incorrect
   - Firewall is blocking port 8096
   - Docker networking misconfiguration

3. **Configuration Issue**
   - Settings not saved properly
   - Whitespace in URL or key
   - Wrong URL format (missing `http://` or port)

4. **Server Issue**
   - Jellyfin requires HTTPS but you're using HTTP
   - API endpoint changed in newer version
   - Reverse proxy not forwarding headers correctly

---

## Tools I've Created for You

### 🔧 Quick API Key Test
```bash
curl http://localhost:3100/api/debug/api-key-test
```

**Best for:** Quick validation if your API key works
- Returns: Valid status, server info, or specific error

### 🔧 Full Connection Diagnostics
```bash
curl http://localhost:3100/api/debug/jellyfin-connection
```

**Best for:** Complete troubleshooting
- Tests: Configuration, connectivity, authentication, user endpoint
- Returns: Detailed status for each test + recommendations
- Includes: Server info, response times, helpful hints

---

## Quick Start - Find Your Problem

### 1️⃣ Test your API key
```bash
curl http://localhost:3100/api/debug/api-key-test
```

### 2️⃣ Check for detailed issues
```bash
curl http://localhost:3100/api/debug/jellyfin-connection
```

### 3️⃣ Read the recommendations in the response

### 4️⃣ Follow the specific solution below

---

## Solutions by Error Type

### ❌ "Invalid API key (HTTP 401)"

```bash
# Step 1: Generate new API key in Jellyfin
# - Login to Jellyfin as admin
# - Go to Dashboard → Settings → API Keys
# - Delete the old key (if exists)
# - Click "+" to create new key
# - Copy the ENTIRE key (it's long, 40+ characters)

# Step 2: Update JellyConnect
# - Go to JellyConnect Admin → Settings
# - Paste the FULL API key
# - Verify no leading/trailing spaces
# - Save

# Step 3: Test
curl http://localhost:3100/api/debug/api-key-test
```

### ❌ "Cannot connect to Jellyfin server"

```bash
# Step 1: Verify URL format
# ✅ Correct: http://jellyfin.example.com:8096
# ❌ Wrong: jellyfin.example.com (no http://)
# ❌ Wrong: http://jellyfin.example.com:8096/ (trailing slash)
# ❌ Wrong: http://localhost:8096 (from Docker, use service name)

# Step 2: For Docker containers
# Use the service name from docker-compose:
# ✅ http://jellyfin:8096 (if service is named "jellyfin")
# ❌ http://localhost:8096 (won't work from another container)

# Step 3: Verify server is running
docker ps | grep jellyfin
# Should show: jellyfin container with status "Up"

# Step 4: Test connectivity
curl -I http://<your-jellyfin-url>:8096
# Should return: HTTP 200 or 302 redirect
```

### ❌ "Cannot resolve hostname"

```bash
# The hostname in your URL is invalid

# Step 1: Verify hostname
ping jellyfin.example.com
# If fails, hostname is wrong

# Step 2: Use IP address instead
# Change URL from: http://jellyfin.example.com:8096
# To: http://192.168.1.100:8096

# Step 3: For Docker, check network
docker network ls
docker inspect bridge
# Both containers must be on same network
```

### ❌ "Connection timeout"

```bash
# Server is too slow or unreachable

# Step 1: Check if server is responding
curl -v http://jellyfin.example.com:8096
# Should respond within a few seconds

# Step 2: Verify firewall
# Port 8096 must be open on the server
# And between JellyConnect and Jellyfin

# Step 3: For Docker, verify network path
docker exec jellyconnect curl http://jellyfin:8096
# Should work if networking is correct
```

---

## Configuration Checklist

✅ **Do this before testing:**

- [ ] Jellyfin server is running (`docker ps` shows container running)
- [ ] URL format is correct (`http://host:8096` with protocol and port)
- [ ] API key is full length (40+ characters, no truncation)
- [ ] No whitespace before/after URL or API key
- [ ] Port 8096 is accessible (firewall allows it)
- [ ] For Docker: using service name, not localhost
- [ ] Settings are saved in JellyConnect admin panel

---

## Code Improvements I Made

### 1. New Debug Endpoint
**File:** `app/api/debug/jellyfin-connection/route.ts`
- Comprehensive connection testing
- Tests: config, connectivity, auth, endpoints
- Provides specific error hints
- Generates actionable recommendations
- Shows server info (version, OS, name)

### 2. Quick Test Endpoint
**File:** `app/api/debug/api-key-test/route.ts`
- Simple API key validation
- Shows if key is valid
- Returns server information
- Minimal but effective

### 3. Enhanced Error Handling
**File:** `app/api/users/route.ts` (improved)
- Better error messages with hints
- Distinguishes between connection/auth/config errors
- Connection timeout protection
- Logs partial API key (first 8 chars) for debugging

### 4. Troubleshooting Docs
**Files:** 
- `JELLYFIN_API_TROUBLESHOOTING.md` - Comprehensive guide
- `JELLYFIN_API_DIAGNOSIS.md` - Diagnosis process and solutions

---

## Testing Commands

```bash
# Test your current configuration
curl http://localhost:3100/api/debug/api-key-test

# Get full diagnostics
curl http://localhost:3100/api/debug/jellyfin-connection

# Test with curl directly (replace with your values)
curl -H "X-Emby-Token: YOUR_API_KEY_HERE" \
  http://jellyfin.example.com:8096/System/Info

# From Docker container
docker exec jellyconnect curl http://jellyfin:8096/System/Info \
  -H "X-Emby-Token: YOUR_API_KEY_HERE"
```

---

## Expected Successful Response

```json
{
  "timestamp": "2026-01-10T...",
  "valid": true,
  "apiKeyConfigured": true,
  "urlConfigured": true,
  "serverInfo": {
    "serverName": "MyJellyfin",
    "version": "10.8.13",
    "os": "Linux"
  }
}
```

---

## Still Not Working?

1. **Check JellyConnect logs:**
   ```bash
   docker logs jellyconnect 2>&1 | grep -E "jellyfin|error|ECONNREFUSED|401"
   ```

2. **Check Jellyfin logs:**
   - Jellyfin UI → Dashboard → Logs
   - Look for "JellyConnect" or API errors

3. **Verify with test endpoint:**
   ```bash
   curl http://localhost:3100/api/debug/jellyfin-connection
   ```
   Read the `recommendations` field carefully

4. **Test with curl directly:**
   ```bash
   curl -v http://YOUR_JELLYFIN_URL:8096/System/Info \
     -H "X-Emby-Token: YOUR_FULL_API_KEY"
   ```
   This shows exactly what's happening at network level

---

## Key Points

📌 **API keys are case-sensitive** - Copy the exact key from Jellyfin

📌 **URL must include the protocol** - `http://` or `https://`

📌 **Default Jellyfin port is 8096** - Unless you changed it

📌 **Docker networking** - Use service name (`jellyfin`) not `localhost`

📌 **Spaces matter** - No leading/trailing spaces in config

📌 **API key revocation** - If key was deleted in Jellyfin, it stops working

---

## What to Do Next

1. Run the diagnostic endpoint
2. Read the specific error and recommendation
3. Follow the corresponding solution above
4. Test again with the diagnostic endpoint
5. Verify it shows `"valid": true` or `"overallStatus": "OK"`

The diagnostic tools will guide you to the exact fix needed! 🎯
