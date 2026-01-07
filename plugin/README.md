# Jellyfin OIDC Plugin

This plugin adds OpenID Connect (OIDC) authentication to Jellyfin, allowing users to log in using an external OIDC provider.

## Features

- OIDC-based authentication
- User linking by email
- Automatic user creation if email not found
- Permission assignment based on OIDC groups:
  - "admin" → Full administrator access
  - "Power User" → Elevated non-admin access
  - "User" → Basic view/play access

## Installation

1. Build the plugin:
   ```
   dotnet build --configuration Release
   ```

2. Copy the built DLL to your Jellyfin plugins directory:
   - Windows: `C:\ProgramData\Jellyfin\Server\plugins\JellyfinOIDCPlugin`
   - Linux: `/var/lib/jellyfin/plugins/JellyfinOIDCPlugin`

3. Restart Jellyfin.

4. Configure the plugin in the Jellyfin web interface under Plugins > Jellyfin OIDC Plugin.

## Configuration

- **OIDC Endpoint**: The base URL of your OIDC provider (e.g., https://your-provider.com)
- **Client ID**: The client ID from your OIDC provider
- **Client Secret**: The client secret from your OIDC provider
- **Scopes**: Space-separated list of scopes (default: openid profile email)
- **Role Claim**: The claim containing the user's groups (default: groups)

## Usage

Users can log in by visiting `/oidc/start` in their browser, which will redirect to the OIDC provider.

After authentication, they will be redirected back to Jellyfin with appropriate permissions set.

## Development

This plugin is based on the Jellyfin plugin template and the SSO plugin reference.

## Notes

The plugin may have compilation warnings or errors in some environments due to package compatibility, but should work at runtime in Jellyfin.