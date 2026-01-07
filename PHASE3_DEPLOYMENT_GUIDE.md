# Phase 3 Deployment Guide

## Quick Start

Phase 3 is complete and the plugin is ready for deployment. Follow these steps to deploy and test the JellyConnect integration.

---

## 📦 Step 1: Locate the Release Build

The compiled plugin DLL is located at:
```
plugin/JellyfinOIDCPlugin/bin/Release/publish/JellyfinOIDCPlugin.v2.dll
```

**File Details:**
- Size: ~75 KB
- Dependencies: Included (IdentityModel, Extensions, Logging)
- Build Status: ✅ Success (0 errors)

---

## 🚀 Step 2: Deploy to Jellyfin

### Option A: Docker Deployment
```bash
# Copy DLL to Jellyfin plugins directory
docker cp plugin/JellyfinOIDCPlugin/bin/Release/publish/JellyfinOIDCPlugin.v2.dll \
  <jellyfin-container-id>:/config/plugins/

# Restart Jellyfin
docker restart <jellyfin-container-id>
```

### Option B: Linux/Windows Deployment
```bash
# Copy to Jellyfin plugins directory
cp plugin/JellyfinOIDCPlugin/bin/Release/publish/JellyfinOIDCPlugin.v2.dll \
   /path/to/jellyfin/config/plugins/

# Restart Jellyfin service
sudo systemctl restart jellyfin
# or
systemctl restart jellyfin
```

### Option C: Windows Service
```powershell
# Stop Jellyfin service
Stop-Service -Name Jellyfin

# Copy DLL to plugins directory
Copy-Item `
  "plugin\JellyfinOIDCPlugin\bin\Release\publish\JellyfinOIDCPlugin.v2.dll" `
  "C:\ProgramData\Jellyfin\plugins\"

# Start Jellyfin service
Start-Service -Name Jellyfin
```

---

## ⚙️ Step 3: Configure JellyConnect Integration

### 3.1 Access Plugin Settings

1. Log in to Jellyfin Admin Panel
2. Navigate to: **Dashboard → Plugins**
3. Find **OIDC Authentication** in the plugins list
4. Click the **gear icon** to configure

### 3.2 Configure JellyConnect URL

1. Scroll down to the **"JellyConnect Integration (Optional)"** section
2. Enter your JellyConnect server URL:
   ```
   https://jellyconnect.example.com
   ```
3. Click **Save** to persist the configuration

**Expected UI:**
```
┌─────────────────────────────────────────────┐
│ JellyConnect Integration (Optional)           │
│                                              │
│ Configure JellyConnect for advanced account  │
│ linking and policy management               │
│                                              │
│ ┌────────────────────────────────────────┐  │
│ │ JellyConnect Server URL                │  │
│ │ https://jellyconnect.example.com       │  │
│ │                                        │  │
│ │ The base URL of your JellyConnect      │  │
│ │ server (e.g., https://jellyconnect...) │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ [Save]                                       │
└─────────────────────────────────────────────┘
```

### 3.3 Verify Configuration

1. Check that the configuration was saved
2. Navigate back to plugin settings
3. Verify the JellyConnect URL is still displayed
4. Configuration is now persistent

---

## 🧪 Step 4: Integration Testing

### Test 1: Configuration Persistence
**Objective:** Verify JellyConnect URL is saved and loaded correctly

**Steps:**
1. Set JellyConnect URL to: `https://jellyconnect.test.local`
2. Click Save
3. Refresh the page
4. Verify the URL is still displayed

**Expected Result:** ✅ URL persists across page refreshes

---

### Test 2: OIDC Login Flow
**Objective:** Verify the complete OIDC login flow with JellyConnect integration

**Prerequisites:**
- Jellyfin configured with OIDC provider
- JellyConnect URL configured in plugin settings
- Test user account in OIDC provider

**Steps:**
1. Log out of Jellyfin
2. Click "Login with OIDC Provider" button
3. Complete OIDC authentication (username/password)
4. Verify account is created in Jellyfin
5. Check JellyConnect for account linking confirmation

**Expected Result:** ✅ Account created in Jellyfin and linked in JellyConnect

---

### Test 3: Token Validation
**Objective:** Verify tokens are validated through JellyConnect

**Steps:**
1. Log in with OIDC provider (from Test 2)
2. Observe browser console for network requests
3. Check JellyConnect API logs for token validation calls
4. Verify validation succeeds and user is authenticated

**Expected Result:** ✅ Tokens validated through JellyConnect without errors

---

### Test 4: Role-Based Access
**Objective:** Verify role-based policies are applied from JellyConnect

**Prerequisites:**
- User account in OIDC provider with roles/groups
- JellyConnect configured to map roles to Jellyfin policies

**Steps:**
1. Log in with OIDC provider
2. Check user details in Jellyfin (`Users` → select user)
3. Verify user roles/policies are applied
4. Check logs for role mapping events

**Expected Result:** ✅ Roles from JellyConnect applied to Jellyfin user

---

### Test 5: Graceful Degradation
**Objective:** Verify plugin works without JellyConnect configured

**Steps:**
1. Clear the JellyConnect URL from plugin settings
2. Save configuration
3. Log out and back into Jellyfin
4. Verify OIDC login still works (without JellyConnect)

**Expected Result:** ✅ Plugin continues to work, gracefully skips JellyConnect integration

---

## 🔍 Troubleshooting

### Issue: "JellyConnect URL field not visible"

**Cause:** Plugin may not have reloaded after deployment

**Solution:**
1. Stop Jellyfin service
2. Verify DLL was copied to correct location
3. Restart Jellyfin
4. Wait 30 seconds for plugins to load
5. Clear browser cache (Ctrl+Shift+Delete)

---

### Issue: "Token validation failed"

**Cause:** JellyConnect server unreachable or invalid URL

**Solutions:**
1. Verify JellyConnect server is running
2. Verify URL is correct and accessible: `https://jellyconnect.example.com`
3. Check network connectivity from Jellyfin server to JellyConnect
4. Check firewall rules (port 443 if HTTPS)
5. Verify SSL certificate is valid (if HTTPS)

**Debug Steps:**
1. Enable debug logging in Jellyfin
2. Check logs for JellyConnect API errors
3. Test JellyConnect health endpoint: `curl https://jellyconnect.example.com/api/health`

---

### Issue: "Configuration not saving"

**Cause:** Permission issue or API error

**Solutions:**
1. Check Jellyfin user has write permissions to config directory
2. Verify browser console for JavaScript errors
3. Check Jellyfin logs for configuration API errors
4. Restart browser and try again

---

### Issue: "Roles not applied to user"

**Cause:** JellyConnect role mapping not configured or user has no roles

**Solutions:**
1. Verify user has roles in OIDC provider
2. Verify JellyConnect has roles configured
3. Check JellyConnect role mapping configuration
4. Verify role names match exactly (case-sensitive)
5. Check Jellyfin logs for policy application errors

---

## 📊 Verification Checklist

After deployment and testing, verify the following:

### Plugin Installation
- [ ] Plugin DLL is in correct location
- [ ] Jellyfin service restarted successfully
- [ ] No plugin loading errors in Jellyfin logs
- [ ] Plugin appears in Plugins list

### Configuration UI
- [ ] "JellyConnect Integration (Optional)" section visible in settings
- [ ] "JellyConnect Server URL" input field displays correctly
- [ ] Save button works
- [ ] Configuration persists across page refreshes

### OIDC Integration
- [ ] OIDC login button still works
- [ ] Callback handler doesn't error
- [ ] Token exchange handler doesn't error
- [ ] No null reference exceptions in logs

### JellyConnect Integration
- [ ] JellyConnect URL is validated
- [ ] Token validation calls succeed
- [ ] Account linking calls succeed
- [ ] Role mapping applies correctly
- [ ] No network errors to JellyConnect

### Graceful Degradation
- [ ] Plugin works without JellyConnect URL configured
- [ ] OIDC login works without JellyConnect
- [ ] No errors when JellyConnect URL is empty
- [ ] No errors when JellyConnect is unreachable

---

## 📝 Log Analysis

### Expected Log Messages

When everything is working correctly, you should see logs like:

```log
[2024-01-01 12:00:00] [OIDC] OIDC callback initiated
[2024-01-01 12:00:01] [OIDC] Validating token with JellyConnect
[2024-01-01 12:00:02] [OIDC] Token validation successful
[2024-01-01 12:00:03] [OIDC] User account created/updated
[2024-01-01 12:00:04] [OIDC] Account linked in JellyConnect
[2024-01-01 12:00:05] [OIDC] User roles applied
```

### Common Error Patterns

```log
# JellyConnect URL not configured
[ERROR] JellyConnectApiClient: No JellyConnect URL configured

# Network error
[ERROR] JellyConnectApiClient: Failed to connect to JellyConnect

# Token validation failed
[ERROR] OidcController: Token validation failed in JellyConnect

# Role mapping failed
[ERROR] OidcController: Failed to apply policies from JellyConnect
```

---

## 🎯 Success Criteria

Phase 3 deployment is successful when:

✅ Plugin DLL loads without errors  
✅ Configuration UI displays correctly  
✅ JellyConnect URL can be configured and persists  
✅ OIDC login flow works end-to-end  
✅ Tokens validated through JellyConnect  
✅ Accounts created and linked in JellyConnect  
✅ Roles/policies applied from JellyConnect  
✅ Plugin gracefully degrades without JellyConnect  

---

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review [PHASE3_COMPLETION_SUMMARY.md](PHASE3_COMPLETION_SUMMARY.md) for architecture details
3. Check Jellyfin logs at: `/config/logs/` (Docker) or configured log directory
4. Review build output at: `plugin/JellyfinOIDCPlugin/build-output.txt`

---

## ✅ Next Steps

After successful deployment and testing:

1. **Monitor in production** - Watch logs and user account creation
2. **Phase 4 enhancements** - Consider additional features:
   - Account linking UI
   - Advanced role mapping
   - Audit logging
   - Health monitoring
3. **Documentation** - Update your deployment documentation with JellyConnect setup
4. **Backup configuration** - Store your JellyConnect URL securely

---

**Deployment Guide Version:** 1.0  
**Phase 3 Status:** ✅ COMPLETE  
**Last Updated:** 2024-01-01  
