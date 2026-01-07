# Jellyfin OIDC Plugin - Quick Setup Guide

## Prerequisites

- Jellyfin server (v10.8+)
- An OIDC-compliant identity provider (Keycloak, Authelia, Auth0, Azure AD, etc.)
- OIDC application/client registration with:
  - Client ID
  - Client Secret  
  - Redirect URI: `https://jellyfin.example.com/api/oidc/callback`

## Installation Steps

### 1. Install the Plugin

**Option A: Manual Installation**
```bash
# Copy the DLL to the Jellyfin plugins directory
cp JellyfinOIDCPlugin.dll /var/lib/jellyfin/plugins/
# Restart Jellyfin
systemctl restart jellyfin
```

**Option B: Docker Installation**
```bash
# Mount plugins volume and copy DLL
docker cp JellyfinOIDCPlugin.dll jellyfin:/config/plugins/
docker restart jellyfin
```

### 2. Configure OIDC Provider

**Example: Keycloak**
1. Create a new Client in your Keycloak realm
2. Set Client Protocol: `openid-connect`
3. Set Access Type: `confidential`
4. Add Valid Redirect URIs:
   - `https://jellyfin.example.com/api/oidc/callback`
5. Enable Client Scopes: `openid`, `profile`, `email`, `groups` (if using groups)
6. Copy the Client ID and Secret

**Example: Authelia**
```yaml
# authelia/configuration.yml
clients:
  - id: jellyfin
    secret: your-secret-here
    redirect_uris:
      - https://jellyfin.example.com/api/oidc/callback
    scopes:
      - openid
      - profile
      - email
      - groups
```

### 3. Configure Plugin in Jellyfin

1. **Go to**: Admin Panel → Plugins → OIDC Authentication
2. **Fill in the settings**:
   - **OIDC Endpoint**: `https://auth.example.com` (or `https://keycloak.example.com/auth/realms/myrealm`)
   - **Client ID**: From your OIDC provider
   - **Client Secret**: From your OIDC provider  
   - **OAuth Scopes**: `openid profile email groups` (one per line)
   - **Role Claim**: `groups` (or your provider's group claim name)

3. **Configure Role Mapping** (Optional):
   - **Admin Role**: `admin` (users in this role get Jellyfin admin access)
   - **Power User Role**: `Power User` (users get full library access)
   - **Other Roles**: Get basic view/play access

4. **Click**: "💾 Save Settings"

### 4. Test SSO Login

1. Go to Jellyfin login page: `https://jellyfin.example.com/auth/login.html`
2. You should see a **"Sign In with SSO"** button
3. Click it and verify you're redirected to your OIDC provider
4. Log in with your OIDC credentials
5. You should be logged into Jellyfin

## Common Issues & Troubleshooting

### SSO Button Not Appearing

**Problem**: "Sign In with SSO" button doesn't show on login page
- **Solution 1**: Clear browser cache (Ctrl+Shift+Delete)
- **Solution 2**: Restart Jellyfin: `systemctl restart jellyfin`
- **Solution 3**: Check plugin is enabled in Admin → Plugins

### "Invalid state" Error

**Problem**: Getting "Invalid state" error during callback
- **Solution**: This usually means the OAuth state was lost (session expired or multiple requests)
  - Try logging in again
  - Check server logs for OIDC errors

### User Not Created

**Problem**: User created in OIDC but not in Jellyfin
- **Verify email claim exists**: Check OIDC provider sends `email` claim
- **Check Jellyfin logs** for user creation errors
- **Verify role claim format** if using group-based roles

### Redirect URI Mismatch

**Problem**: "redirect_uri_mismatch" error from OIDC provider
- **Solution**: Ensure OIDC provider has registered redirect URI:
  - `https://jellyfin.example.com/api/oidc/callback`
  - Replace `jellyfin.example.com` with your actual domain

### Wrong Redirect After Login

**Problem**: After login, user is redirected to wrong URL
- **Solution**: Check plugin configuration has correct OIDC endpoint
- **Verify** no trailing slashes in URLs

## Configuration File

Plugin settings are stored in:
```
/var/lib/jellyfin/config/plugins/oidc.xml
```

Manual editing (advanced):
```xml
<?xml version="1.0" encoding="utf-8"?>
<PluginConfiguration>
  <OidEndpoint>https://auth.example.com</OidEndpoint>
  <OidClientId>jellyfin</OidClientId>
  <OidSecret>secret-here</OidSecret>
  <OidScopes>
    <string>openid</string>
    <string>profile</string>
    <string>email</string>
    <string>groups</string>
  </OidScopes>
  <RoleClaim>groups</RoleClaim>
</PluginConfiguration>
```

## Advanced Usage

### Using Different Group Claim Names

If your OIDC provider uses a different claim for groups:

**Keycloak**: Set `Role Claim` to `resource_access.jellyfin.roles` or `groups`
**Azure AD**: Set to `groups` or `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups`

### Nested Group Claims

Some providers (like Azure AD) return nested group structures. The plugin looks for the claim name you specify, so ensure it matches your provider's format.

### Updating Role Assignments

1. Change user's group/role in OIDC provider
2. User logs in again via SSO
3. Role assignments are updated in Jellyfin

## Uninstalling the Plugin

```bash
# Remove the plugin file
rm /var/lib/jellyfin/plugins/JellyfinOIDCPlugin.dll

# Restart Jellyfin
systemctl restart jellyfin

# Remove configuration (optional)
rm /var/lib/jellyfin/config/plugins/oidc.xml
```

## Security Best Practices

- ✅ Always use HTTPS for Jellyfin and OIDC provider
- ✅ Keep Client Secret secure (use environment variables)
- ✅ Regularly update plugin dependencies
- ✅ Use strong OAuth scopes (avoid `offline_access` unless needed)
- ✅ Review user permissions after initial setup
- ✅ Enable OIDC provider's security features (IP allowlists, etc.)

## Support

For issues or questions:
1. Check Jellyfin logs: `/var/lib/jellyfin/logs/`
2. Enable debug logging in Jellyfin for plugin diagnostics
3. Verify OIDC provider logs for authentication failures
