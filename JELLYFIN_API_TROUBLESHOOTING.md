# Jellyfin API Connection Troubleshooting Guide

## Quick Test
Run this command to test your Jellyfin API connection:

```bash
curl http://localhost:3100/api/debug/jellyfin-connection
```

The response will provide detailed diagnostics about:
- Configuration status
- Network connectivity
- API authentication
- User endpoint access
- Server information

---

## Common Issues and Solutions

### 1. **401 Unauthorized - Invalid API Key**

**Symptoms:**
- Error: `HTTP 401 Unauthorized`
- API key validation fails
- Can't fetch users or system info

**Solutions:**
1. **Generate a new API key:**
   - Go to Jellyfin Admin Dashboard
   - Navigate to Dashboard → Settings → API Keys
   - Delete the old key and create a new one
   - Copy the entire key (it's long, don't truncate it)

2. **Verify API key is correct:**
   - Check for trailing/leading whitespace
   - Ensure the full key is copied (40+ characters)
   - API keys are case-sensitive

3. **Check if key was revoked:**
   - Verify the key still exists in Jellyfin
   - It may have been automatically revoked after inactivity

### 2. **Connection Refused - Server Unreachable**

**Symptoms:**
- Error: `ECONNREFUSED` or `Connection refused`
- Network timeout errors
- Can't reach Jellyfin at all

**Solutions:**
1. **Verify Jellyfin is running:**
   ```bash
   # Check if Jellyfin service/container is active
   docker ps | grep jellyfin
   # or
   systemctl status jellyfin
   ```

2. **Check the URL format:**
   - ✅ Correct: `http://jellyfin.example.com:8096` or `http://192.168.1.100:8096`
   - ❌ Wrong: Missing protocol (needs `http://` or `https://`)
   - ❌ Wrong: Trailing slash `http://localhost:8096/`
   - ❌ Wrong: Missing port (Jellyfin default is 8096)

3. **Verify network connectivity:**
   ```bash
   # Test if you can reach the server
   curl -I http://<jellyfin-host>:8096
   # Should return HTTP 200 or 302 redirect
   ```

4. **Check Docker/Container networking:**
   - If running in Docker, use the service name instead of localhost
   - Example: `http://jellyfin:8096` (if both are on same Docker network)
   - NOT `http://localhost:8096` from another container

### 3. **DNS Resolution Failed**

**Symptoms:**
- Error: `ENOTFOUND` or `getaddrinfo ENOTFOUND`
- Hostname not found

**Solutions:**
1. **Verify hostname is correct:**
   ```bash
   # Test DNS resolution
   nslookup jellyfin.example.com
   ping jellyfin.example.com
   ```

2. **Use IP address instead:**
   - If DNS is unreliable, use the IP address directly
   - Example: `http://192.168.1.100:8096`

3. **For Docker containers:**
   - Use the service name from docker-compose
   - Ensure both containers are on the same network

### 4. **Connection Timeout**

**Symptoms:**
- Error: `timeout` or `ETIMEDOUT`
- Request takes too long and cancels

**Solutions:**
1. **Check server responsiveness:**
   ```bash
   # Test basic connectivity
   timeout 5 curl -I http://<jellyfin-host>:8096
   ```

2. **Verify firewall rules:**
   - Port 8096 (or your custom port) must be open
   - Check both server-side and network firewalls

3. **Check network path:**
   - High latency connections may need longer timeout
   - Ensure no network issues between JellyConnect and Jellyfin

### 5. **Jellyfin Requires HTTPS**

**Symptoms:**
- Can access Jellyfin UI in browser
- API calls fail or redirect
- Reverse proxy is in front of Jellyfin

**Solutions:**
1. **Update configuration to use HTTPS:**
   - Change URL from `http://` to `https://`
   - Example: `https://jellyfin.example.com:8920`

2. **Disable SSL verification (development only):**
   - Add the URL with proper scheme
   - Most reverse proxies handle SSL automatically

### 6. **Firewall or Proxy Blocking**

**Symptoms:**
- Connection works locally but not from other machines
- SSL/TLS handshake failures
- Proxy errors

**Solutions:**
1. **Check firewall rules:**
   ```bash
   # On Linux
   sudo ufw status
   sudo ufw allow 8096
   
   # On Windows
   netsh advfirewall firewall show rule name=Jellyfin
   ```

2. **For reverse proxy setups:**
   - Ensure reverse proxy forwards X-Emby-* headers
   - Check proxy logs for request rejections
   - Verify proxy has correct upstream server address

---

## Debug Endpoints

### `/api/debug/jellyfin-connection`
**Purpose:** Full connection diagnostics
```bash
curl http://localhost:3100/api/debug/jellyfin-connection
```

**Returns:**
- Configuration status
- Network connectivity test
- API authentication test
- User list endpoint test
- Server information
- Detailed recommendations

### `/api/debug/group-mapping`
**Purpose:** Test OIDC group-to-role mapping
```bash
curl -X POST http://localhost:3100/api/debug/group-mapping \
  -H "Content-Type: application/json" \
  -d '{"testGroups": ["administrators"]}'
```

---

## Configuration Checklist

- [ ] Jellyfin server is running and accessible
- [ ] URL format is correct (includes protocol and port)
- [ ] API key is valid and not revoked
- [ ] API key is copied completely (no truncation)
- [ ] No whitespace before/after URL or API key
- [ ] Port is open in firewall
- [ ] Network path from JellyConnect to Jellyfin is clear
- [ ] If using reverse proxy, it forwards headers correctly

---

## Testing with curl

```bash
# Test basic connectivity
curl -I http://jellyfin.example.com:8096

# Test API authentication
curl -H "X-Emby-Token: YOUR_API_KEY" \
  http://jellyfin.example.com:8096/System/Info

# Test user endpoint
curl -H "X-Emby-Token: YOUR_API_KEY" \
  http://jellyfin.example.com:8096/Users

# Full diagnostics (from JellyConnect)
curl http://jellyconnect-host:3100/api/debug/jellyfin-connection
```

---

## Still Having Issues?

1. **Check logs:**
   - JellyConnect logs: `docker logs jellyconnect` or app logs
   - Jellyfin logs: Admin Dashboard → Logs or system logs

2. **Verify with direct API calls:**
   ```bash
   curl -v http://jellyfin.example.com:8096/System/Info \
     -H "X-Emby-Token: YOUR_KEY"
   ```

3. **Check network path:**
   ```bash
   # If using containers
   docker exec jellyconnect curl http://jellyfin:8096/System/Info
   
   # From the host
   curl http://localhost:8096/System/Info
   ```

4. **Review configuration:**
   - Admin Dashboard → Settings → API Keys (verify key exists)
   - Network settings (especially if behind reverse proxy)
   - User permissions (API key must have proper access)
