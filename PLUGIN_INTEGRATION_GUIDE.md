# Jellyfin OIDC Plugin Integration with JellyConnect

## Overview
This guide explains how to integrate the existing Jellyfin OIDC Plugin with JellyConnect's account linking system. The plugin will use JellyConnect's API to validate OIDC tokens and link user accounts.

## Prerequisites
- Jellyfin 10.8+ with the OIDC plugin installed
- JellyConnect running and configured with OIDC provider
- .NET 8.0 SDK (for building the plugin)
- Visual Studio or similar IDE

## Integration Steps

### Step 1: Add JellyConnect Configuration

**File**: `Configuration/PluginConfiguration.cs`

Add JellyConnect URL to the plugin configuration:

```csharp
public class PluginConfiguration : BasePluginConfiguration
{
    // Existing OIDC settings...
    
    [JsonPropertyName("jellyconnectUrl")]
    public string? JellyConnectUrl { get; set; } = "http://localhost:3000";
}
```

**File**: `web/configurationpage.html`

Add input field for JellyConnect URL:

```html
<div>
    <label for="jellyconnectUrl">JellyConnect URL</label>
    <input 
        id="jellyconnectUrl" 
        type="url" 
        placeholder="http://localhost:3000"
        value="{{ plugin.Configuration.JellyConnectUrl }}"
    />
    <p class="hint">URL of your JellyConnect instance (e.g., http://localhost:3000)</p>
</div>
```

### Step 2: Add JellyConnect API Client

**File**: `Clients/JellyConnectApiClient.cs` (NEW)

Copy the provided `JellyConnectApiClient.cs` file into the `Clients` folder. This provides:
- Token validation
- Account linking
- Policy retrieval
- Health checks

### Step 3: Update OidcController

**File**: `Controllers/OidcController.cs`

Inject the JellyConnectApiClient and update the callback handler:

```csharp
private readonly JellyConnectApiClient _jellyConnectClient;

public OidcController(
    IUserManager userManager, 
    ILogger<OidcController> logger,
    HttpClient httpClient)
{
    _userManager = userManager;
    _logger = logger;
    
    // Initialize JellyConnect client
    var config = Plugin.Instance?.Configuration;
    if (config?.JellyConnectUrl != null)
    {
        _jellyConnectClient = new JellyConnectApiClient(
            httpClient, 
            logger, 
            config.JellyConnectUrl
        );
    }
}
```

### Step 4: Update Callback Handler

**File**: `Controllers/OidcController.cs` - `Callback()` method

Replace the callback implementation to use JellyConnect:

```csharp
[HttpGet("callback")]
public async Task<IActionResult> Callback()
{
    var config = Plugin.Instance?.Configuration;
    if (config == null)
        return BadRequest("Plugin not initialized");

    try
    {
        // ... existing OIDC processing code ...
        
        // Get email from OIDC response
        var email = result.User?.FindFirst("email")?.Value ?? 
                   result.User?.FindFirst("preferred_username")?.Value;
        
        if (string.IsNullOrEmpty(email))
            return BadRequest("No email found in OIDC response");

        // Call JellyConnect to validate token and get user info
        var tokenValidation = await _jellyConnectClient.ValidateTokenAsync(
            result.AccessToken,
            result.IdentityTokenString ?? "",
            email
        );

        if (tokenValidation?.Data == null)
        {
            _logger.LogError("JellyConnect token validation failed");
            return BadRequest("User validation failed");
        }

        var userData = tokenValidation.Data;

        // Get or create user in Jellyfin
        var user = _userManager.GetUserByName(userData.Email);
        if (user == null)
        {
            _logger.LogInformation("Creating new Jellyfin user: {Email}", userData.Email);
            user = await _userManager.CreateUserAsync(userData.Email).ConfigureAwait(false);
        }

        // Link account in JellyConnect
        if (!userData.Exists)
        {
            var groups = result.User?.FindFirst(config.RoleClaim)?.Value?
                .Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries) 
                ?? Array.Empty<string>();

            var linkResult = await _jellyConnectClient.LinkAccountAsync(
                new LinkAccountRequest
                {
                    Email = email,
                    Username = userData.Username,
                    JellyfinUserId = user.Id.ToString(),
                    DisplayName = userData.DisplayName ?? email,
                    Groups = groups,
                    AccessToken = result.AccessToken
                }
            );

            if (linkResult?.Success != true)
            {
                _logger.LogWarning("Failed to link account in JellyConnect");
                // Don't fail - user is created in Jellyfin
            }
        }

        // Get user policy from JellyConnect
        var groups = result.User?.FindFirst(config.RoleClaim)?.Value?
            .Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries) 
            ?? Array.Empty<string>();

        var policyResult = await _jellyConnectClient.GetUserPolicyAsync(
            groups,
            user.Id.ToString()
        );

        if (policyResult?.Data?.Policy != null)
        {
            // Apply the policy to the Jellyfin user
            // (Use reflection or direct property assignment based on policy structure)
            _logger.LogInformation("Applied policy from JellyConnect for user: {Email}", email);
        }

        // Update user in Jellyfin
        await _userManager.UpdateUserAsync(user).ConfigureAwait(false);

        _logger.LogInformation("User {Email} authenticated and linked successfully", email);

        StateManager.Remove(stateParam);
        return Redirect("/");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "OIDC callback error");
        return BadRequest($"OIDC error: {ex.Message}");
    }
}
```

### Step 5: Update Token Exchange Handler

**File**: `Controllers/OidcController.cs` - `ExchangeToken()` method

Add JellyConnect integration to token exchange:

```csharp
[HttpPost("token")]
public async Task<IActionResult> ExchangeToken([FromBody] TokenExchangeRequest request)
{
    // ... existing validation code ...

    try
    {
        // ... get user info from OIDC provider ...
        
        var email = userInfoResult.Claims.FirstOrDefault(c => c.Type == "email")?.Value;

        // Validate with JellyConnect
        var validation = await _jellyConnectClient.ValidateTokenAsync(
            request.AccessToken,
            request.IdToken ?? "",
            email
        );

        if (validation?.Data == null)
            return Unauthorized("User validation failed");

        var userData = validation.Data;

        // Get or create user
        var user = _userManager.GetUserByName(userData.Email);
        if (user == null && config.AutoCreateUser)
        {
            user = await _userManager.CreateUserAsync(userData.Email).ConfigureAwait(false);
            
            // Link in JellyConnect
            await _jellyConnectClient.LinkAccountAsync(
                new LinkAccountRequest
                {
                    Email = userData.Email,
                    Username = userData.Username,
                    JellyfinUserId = user.Id.ToString(),
                    DisplayName = userData.DisplayName,
                    Groups = userData.Groups
                }
            );
        }

        return Ok(new TokenExchangeResponse
        {
            Success = true,
            UserId = user?.Id.ToString(),
            Username = user?.Username,
            Email = userData.Email,
            IsAdmin = userData.Roles?.Contains("admin") ?? false,
            Message = "User authenticated successfully"
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Token exchange error");
        return StatusCode(500, $"Token exchange failed: {ex.Message}");
    }
}
```

### Step 6: Add Dependency Injection

**File**: `Plugin.cs` or Startup code

Register HttpClient for JellyConnect:

```csharp
// In your service registration
services.AddHttpClient<JellyConnectApiClient>();
```

## Configuration

After building and installing the plugin:

1. Go to Jellyfin Admin → Plugins → OIDC Authentication → Settings
2. Configure OIDC provider settings as usual
3. **NEW**: Enter your JellyConnect URL (e.g., `http://localhost:3000`)
4. Save the configuration

## API Endpoints Used

The plugin will call these JellyConnect API endpoints:

- `GET /api/plugin/health` - Check API availability
- `POST /api/plugin/validate-token` - Validate OIDC token
- `POST /api/plugin/link-account` - Link user account
- `POST /api/plugin/get-user-policy` - Get user permissions
- `GET /api/plugin/get-config` - Get plugin configuration

All endpoints return standardized JSON responses with `success`, `data`, `error`, and `message` fields.

## Error Handling

The plugin will gracefully handle JellyConnect API failures:

- If JellyConnect is unavailable, the plugin falls back to standard OIDC auth
- Token validation failures prevent user login
- Account linking failures log warnings but don't prevent login
- Policy retrieval failures use default permissions

## Testing

1. **Health Check**: 
   ```bash
   curl http://localhost:3000/api/plugin/health
   ```

2. **Token Validation**:
   ```bash
   curl -X POST http://localhost:3000/api/plugin/validate-token \
     -H "Content-Type: application/json" \
     -d '{"accessToken":"...", "email":"user@example.com"}'
   ```

3. **Account Linking**:
   ```bash
   curl -X POST http://localhost:3000/api/plugin/link-account \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com", "jellyfinUserId":"...", "groups":["admin"]}'
   ```

## Troubleshooting

### "Plugin not initialized"
- Ensure the OIDC plugin is properly installed
- Check plugin configuration in Jellyfin admin

### "JellyConnect API unavailable"
- Verify JellyConnect URL is correct and accessible
- Check JellyConnect is running and API is enabled
- Review Jellyfin plugin logs for connection errors

### "Token validation failed"
- Ensure token has `email` claim
- Check OIDC provider configuration
- Verify tokens are not expired

### Users not linking
- Check JellyConnect database is accessible
- Review database logs for errors
- Verify email claim is present in token

## Building the Plugin

```bash
cd plugin/JellyfinOIDCPlugin
dotnet build
dotnet publish -c Release
```

Output: `bin/Release/net8.0/JellyfinOIDCPlugin.dll`

## Next Steps

1. Build and test the updated plugin locally
2. Test with your OIDC provider
3. Verify account linking in JellyConnect database
4. Deploy to production
5. Create release with version bump

