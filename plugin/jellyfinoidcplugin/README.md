# Jellyfin OIDC Authentication Plugin

A custom OIDC (OpenID Connect) authentication plugin for Jellyfin that enables Single Sign-On (SSO) with email-based user linking and role-based access control.

## Features

- **OIDC/OAuth2 Integration**: Authenticate users via any OIDC-compliant identity provider
- **Automatic User Creation**: Automatically creates new Jellyfin users based on OIDC email claims
- **Email-Based User Linking**: Links OIDC identities to existing Jellyfin accounts by email
- **Role-Based Access Control**: Assigns user permissions based on OIDC group/role claims
- **Configurable Settings**: Easily configure OIDC endpoint, client credentials, and claim mappings

## Installation

1. Build the plugin or download the compiled DLL
2. Copy the `JellyfinOIDCPlugin.dll` to your Jellyfin plugins directory:
   - Linux: `/var/lib/jellyfin/plugins/`
   - Windows: `%AppData%\Jellyfin\plugins\`
   - Docker: `/config/plugins/`
3. Restart Jellyfin
4. Navigate to Plugins → OIDC Authentication to configure settings

## Configuration

### OIDC Settings

The plugin requires the following OIDC provider information:

- **OID Endpoint**: The OIDC provider's authority/discovery endpoint (e.g., `https://auth.example.com`)
- **OID Client ID**: The OIDC application client ID
- **OID Secret**: The OIDC application client secret
- **OID Scopes**: Comma-separated list of OAuth scopes (default: `openid, profile, email, groups`)
- **Role Claim**: The OIDC claim that contains user groups/roles (default: `groups`)

### Enabling the SSO Login Button

The SSO login button is automatically available once the plugin is enabled. To make it appear on the Jellyfin login page:

1. **Configuration Page**: Go to **Admin Panel → Plugins → OIDC Authentication** and save your OIDC settings
2. **Login Page**: The "Sign In with SSO" button will automatically appear above the traditional login form
3. **Custom Styling**: You can customize the button appearance by modifying `web/oidc-login.js`

The login script is automatically injected into the login page and provides:
- A prominent SSO button with icon
- Loading indicator while redirecting
- Graceful fallback if OIDC is not configured
- Mobile-responsive design

### User Roles

The plugin supports three role levels based on the **Role Claim**:

1. **admin**: Full administrator access to Jellyfin
   - Is Administrator: ✓
   - Enable All Folders: ✓
   - Enable Content Deletion: ✓
   - Enable Remote Control: ✓
   - Enable Shared Device Control: ✓

2. **Power User**: Elevated access without admin privileges
   - Is Administrator: ✗
   - Enable All Folders: ✓
   - Enable Content Deletion: ✗
   - Enable Remote Control: ✗
   - Enable Shared Device Control: ✗

3. **User** (or any other role): Basic access to view and play media
   - Is Administrator: ✗
   - Enable All Folders: ✗ (access limited to assigned folders)
   - Basic view/play permissions: ✓

## Usage

### Initial Login

1. Users navigate to the Jellyfin login page
2. They will see a **"Sign In with SSO"** button at the top of the login form
3. Clicking the button redirects them to the OIDC provider for authentication
4. After successful authentication, they are redirected back to Jellyfin
5. If the user doesn't exist in Jellyfin, a new account is created automatically
6. If the user exists (matched by email), they are logged in to the existing account

### Configuring SSO Settings

1. After plugin installation, navigate to **Admin → Plugins → OIDC Authentication**
2. Configure the following required settings:
   - **OIDC Authority/Discovery Endpoint**: Your OIDC provider's base URL
   - **Client ID**: The application ID from your OIDC provider
   - **Client Secret**: The application secret from your OIDC provider
3. Optionally customize:
   - **OAuth Scopes**: Which scopes to request from the provider
   - **Role Claim**: The OIDC claim containing user group/role information
4. Click **Save Settings** to apply changes
5. The SSO button will now appear on the login page

### Email Matching

User matching is performed using the following claim priority:
1. `email` claim
2. `preferred_username` claim  
3. `sub` claim (OpenID subject identifier as fallback)

The matched email becomes the Jellyfin username for new accounts.

## API Endpoints

- `GET /api/oidc/start`: Initiates the OIDC authentication flow and redirects to the provider
- `GET /api/oidc/callback`: OIDC provider callback endpoint that processes the authentication response

## Architecture

### Components

- **Plugin.cs**: Main plugin class that registers the plugin with Jellyfin and implements `IHasWebPages` for configuration page
- **PluginConfiguration.cs**: Configuration storage and settings
- **OidcAuthenticationProvider.cs**: Implements the Jellyfin `IAuthenticationProvider` interface
- **OidcController.cs**: REST API endpoints for the OIDC OAuth flow
- **OidcStaticController.cs**: Serves the login script as embedded resource
- **web/configurationpage.html**: Plugin configuration UI with OIDC settings form
- **web/oidc-login.js**: Login page integration script that adds SSO button

### Dependencies

- **IdentityModel.OidcClient** (v5.2.1): OIDC client library for OAuth flows
- **Jellyfin** (v10.9.0): Jellyfin API and plugin framework
- **.NET 8.0**: Target framework

## Building from Source

```bash
cd JellyfinOIDCPlugin
dotnet build --configuration Release
```

The compiled DLL will be in `bin/Release/net8.0/JellyfinOIDCPlugin.dll`

## Troubleshooting

### Plugin Not Appearing

- Verify the plugin DLL is in the correct plugins directory
- Check Jellyfin logs for loading errors
- Restart Jellyfin after installation

### Authentication Fails

- Verify OIDC endpoint is accessible and valid
- Check client ID and secret are correct
- Confirm redirect URI matches OIDC provider configuration
- Check OIDC provider logs for errors

### User Creation Fails

- Ensure the email claim is present in the OIDC response
- Verify the email claim uses the correct name in Role Claim setting
- Check Jellyfin logs for user creation errors

### Roles Not Applied

- Verify the Role Claim field matches the OIDC provider's group claim name
- Ensure users have the correct group/role assigned in the OIDC provider
- Check case sensitivity of role names (`admin`, `Power User`)
- Verify scopes include `groups` if using group-based role claims

## Security Considerations

- Use HTTPS for all OIDC communications
- Keep client secrets secure and never commit to version control
- Validate OIDC provider certificates
- Use strong client secrets in your OIDC provider configuration
- Regularly update plugin dependencies for security patches

## License

[Specify your license here]

## Support

For issues, questions, or contributions, please refer to the plugin repository.

## Changelog

### v1.0.0 (Initial Release)
- Basic OIDC authentication support
- Email-based user linking and creation
- Role-based access control
- Configurable OIDC settings
