# Jellyfin OIDC Plugin Integration with JellyConnect

## Overview
Integrate the existing Jellyfin OIDC Plugin with JellyConnect to enable seamless SSO authentication and account linking.

## Architecture

### Current State
- **JellyConnect App**: Next.js web app with OIDC provider configuration and account management
- **Jellyfin OIDC Plugin**: .NET 8 plugin that handles OIDC OAuth flows for Jellyfin login

### Integration Goal
- Plugin calls JellyConnect API endpoints to validate/link accounts
- Plugin uses JellyConnect's OIDC provider configuration
- Seamless account linking through shared API

## Integration Points

### 1. Plugin → JellyConnect API
The plugin will call new JellyConnect API endpoints to:
- **Validate OIDC Token**: `POST /api/plugin/validate-token` - Verify token and get user info
- **Link/Create Account**: `POST /api/plugin/link-account` - Link Jellyfin user to JellyConnect account
- **Get User Policy**: `POST /api/plugin/get-user-policy` - Get role-based policies from JellyConnect
- **Health Check**: `GET /api/plugin/health` - Check API availability

### 2. Configuration Sharing
- Plugin reads configuration from JellyConnect API
- Alternatively, plugin can use same configuration file format
- Configuration includes:
  - OIDC Provider endpoint
  - Client ID and Secret
  - Role/group mappings
  - Auto-create user settings

### 3. User Account Linking Flow

```
Jellyfin Login
    ↓
User clicks "SSO with JellyConnect"
    ↓
Plugin initiates OAuth → JellyConnect OIDC Provider
    ↓
User authenticates at OIDC Provider
    ↓
JellyConnect receives callback, creates session
    ↓
Plugin calls /api/plugin/validate-token with access token
    ↓
JellyConnect validates token and returns user info
    ↓
Plugin calls /api/plugin/link-account with user info
    ↓
JellyConnect creates/updates user in database
    ↓
Plugin sets user policies (admin, power user, etc.) based on groups
    ↓
User authenticated in Jellyfin
```

## Implementation Steps

### Phase 1: Create Plugin API Endpoints
- [ ] Create `/api/plugin/health` - Health check endpoint
- [ ] Create `/api/plugin/validate-token` - Token validation endpoint
- [ ] Create `/api/plugin/link-account` - Account linking endpoint
- [ ] Create `/api/plugin/get-user-policy` - Get user policy endpoint
- [ ] Create `/api/plugin/get-config` - Get plugin configuration

### Phase 2: Update Plugin Code
- [ ] Modify OidcController to call JellyConnect API endpoints
- [ ] Add JellyConnect API client to plugin
- [ ] Update configuration to support JellyConnect URL
- [ ] Add error handling for API failures

### Phase 3: Testing
- [ ] Test token validation flow
- [ ] Test account creation and linking
- [ ] Test role-based access control
- [ ] Test error scenarios

### Phase 4: Documentation
- [ ] Update plugin README
- [ ] Create setup guide
- [ ] Document API endpoints

## API Endpoint Specifications

### 1. GET /api/plugin/health
Verifies that the JellyConnect API is available

**Response**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "jellyfinConnected": true
}
```

### 2. POST /api/plugin/validate-token
Validates an OIDC access token and returns user information

**Request**:
```json
{
  "accessToken": "string",
  "idToken": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "email": "string",
    "username": "string",
    "displayName": "string",
    "groups": ["string"],
    "roles": ["admin", "user"]
  },
  "message": "Token validated successfully"
}
```

### 3. POST /api/plugin/link-account
Links a Jellyfin user account to a JellyConnect account

**Request**:
```json
{
  "email": "user@example.com",
  "username": "jellyfin_username",
  "jellyfinUserId": "jellyfin_user_id",
  "displayName": "User Display Name",
  "groups": ["admin"],
  "accessToken": "oauth_token"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "linked": true,
    "jellyfinId": "string"
  },
  "message": "Account linked successfully"
}
```

### 4. POST /api/plugin/get-user-policy
Gets Jellyfin user policies based on groups

**Request**:
```json
{
  "groups": ["admin", "power-users"],
  "userId": "jellyfin_user_id"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isAdministrator": true,
    "isHidden": false,
    "isDisabled": false,
    "maxActiveSessions": -1,
    "remoteClientBitrateLimit": 0
  },
  "message": "Policy retrieved successfully"
}
```

### 5. GET /api/plugin/get-config
Gets current plugin configuration from JellyConnect

**Response**:
```json
{
  "success": true,
  "data": {
    "oidcEndpoint": "string",
    "clientId": "string",
    "clientSecret": "string",
    "scopes": ["openid", "profile", "email"],
    "roleClaim": "groups",
    "autoCreateUser": true
  }
}
```

## Security Considerations

1. **API Authentication**
   - Plugin must authenticate with shared secret
   - Use API key or JWT for plugin-to-JellyConnect communication
   - Rate limiting on plugin endpoints

2. **Token Validation**
   - Always validate OIDC token signature
   - Check token expiration
   - Verify token was issued by trusted provider

3. **Account Linking**
   - Require email verification before linking
   - Log all account linking events
   - Prevent unauthorized account takeover

4. **Configuration Security**
   - Don't expose client secrets in responses
   - Use environment variables for sensitive data
   - Implement access control on configuration endpoints

## Benefits

1. **Single Sign-On**: Users can log into Jellyfin via JellyConnect's OIDC provider
2. **Account Linking**: Seamless account linkage between Jellyfin and JellyConnect
3. **Role Management**: Automatic role/group synchronization
4. **Centralized Configuration**: OIDC settings managed in JellyConnect
5. **User Creation**: Automatic Jellyfin user creation on first OIDC login

## Future Enhancements

1. **User Profile Sync**: Sync user profile picture and display name
2. **Device Management**: Track authorized devices per user
3. **Audit Logging**: Detailed logging of all SSO events
4. **Multi-Provider Support**: Support multiple OIDC providers
5. **Rate Limiting**: Enhanced rate limiting for security
6. **Webhooks**: Real-time notifications of user events

