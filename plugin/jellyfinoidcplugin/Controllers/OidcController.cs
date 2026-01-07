using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using IdentityModel.OidcClient;
using JellyfinOIDCPlugin.Clients;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace JellyfinOIDCPlugin.Controllers;

#nullable enable

[ApiController]
[Route("api/oidc")]
public class OidcController : ControllerBase
{
    private readonly IUserManager _userManager;
    private readonly ILogger<OidcController> _logger;
    private readonly JellyConnectApiClient? _jellyConnectClient;
    private static readonly Dictionary<string, object> StateManager = new(); // Store AuthorizeState objects

    public OidcController(IUserManager userManager, ILogger<OidcController> logger, JellyConnectApiClient? jellyConnectClient = null)
    {
        _userManager = userManager;
        _logger = logger;
        _jellyConnectClient = jellyConnectClient;
    }

    [HttpGet("start")]
    public async Task<IActionResult> Start()
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null)
        {
            return BadRequest("Plugin not initialized");
        }

        var options = new OidcClientOptions
        {
            Authority = config.OidEndpoint?.Trim(),
            ClientId = config.OidClientId?.Trim(),
            ClientSecret = config.OidSecret?.Trim(),
            RedirectUri = GetRedirectUri(),
            Scope = string.Join(" ", config.OidScopes)
        };

        try
        {
            var client = new OidcClient(options);
            var result = await client.PrepareLoginAsync().ConfigureAwait(false);

            // Store the authorize state for the callback
            var stateString = (string)result.GetType().GetProperty("State")?.GetValue(result);
            if (!string.IsNullOrEmpty(stateString))
            {
                StateManager[stateString] = result;
            }

            var startUrl = (string)result.GetType().GetProperty("StartUrl")?.GetValue(result);
            if (string.IsNullOrEmpty(startUrl))
            {
                _logger.LogError("Could not get StartUrl from OIDC result");
                return BadRequest("OIDC initialization failed");
            }

            return Redirect(startUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OIDC start error");
            return BadRequest("OIDC error: " + ex.Message);
        }
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback()
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null)
        {
            return BadRequest("Plugin not initialized");
        }

        try
        {
            var stateParam = Request.Query["state"].ToString();
            if (string.IsNullOrEmpty(stateParam) || !StateManager.TryGetValue(stateParam, out var storedState))
            {
                _logger.LogWarning("Invalid state: {State}", stateParam);
                return BadRequest("Invalid state");
            }

            var options = new OidcClientOptions
            {
                Authority = config.OidEndpoint?.Trim(),
                ClientId = config.OidClientId?.Trim(),
                ClientSecret = config.OidSecret?.Trim(),
                RedirectUri = GetRedirectUri(),
                Scope = string.Join(" ", config.OidScopes)
            };

            var client = new OidcClient(options);
            // Cast stored state to AuthorizeState - it's stored as object
            var authorizeState = (AuthorizeState)storedState;
            var result = await client.ProcessResponseAsync(Request.QueryString.Value, authorizeState).ConfigureAwait(false);

            if (result.IsError)
            {
                _logger.LogError("OIDC callback failed: {Error} - {ErrorDescription}", result.Error, result.ErrorDescription);
                return BadRequest("OIDC authentication failed");
            }

            // Get email from claims
            var email = result.User?.FindFirst("email")?.Value ?? 
                       result.User?.FindFirst("preferred_username")?.Value ??
                       result.User?.FindFirst("sub")?.Value;
            
            if (string.IsNullOrEmpty(email))
            {
                _logger.LogWarning("No email/username found in OIDC response");
                return BadRequest("No email/username found in OIDC response");
            }

            // Get roles from claims
            var rolesClaimValue = result.User?.FindFirst(config.RoleClaim)?.Value;
            var roles = string.IsNullOrEmpty(rolesClaimValue)
                ? new List<string>()
                : rolesClaimValue.Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries).ToList();

            // If JellyConnect is configured, validate token and link account
            if (_jellyConnectClient != null && !string.IsNullOrEmpty(config.JellyConnectUrl))
            {
                try
                {
                    _logger.LogInformation("Validating token with JellyConnect for email: {Email}", email);
                    
                    // Validate token with JellyConnect
                    var tokenValidationResponse = await _jellyConnectClient.ValidateTokenAsync(
                        result.AccessToken ?? "",
                        result.IdentityToken ?? "",
                        email
                    ).ConfigureAwait(false);
                    
                    if (tokenValidationResponse?.Success == true && tokenValidationResponse.Data != null)
                    {
                        _logger.LogInformation("Token validated successfully for {Email}", email);
                        // Use groups from JellyConnect response if available
                        if (tokenValidationResponse.Data.Groups?.Length > 0)
                        {
                            roles = new List<string>(tokenValidationResponse.Data.Groups);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("Token validation failed with JellyConnect");
                        return Unauthorized("Token validation failed with JellyConnect");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "JellyConnect token validation error");
                    // Continue without JellyConnect validation if it fails
                }
            }

            // Get or create user
            var user = _userManager.GetUserByName(email);
            if (user == null)
            {
                _logger.LogInformation("Creating new user: {Email}", email);
                user = await _userManager.CreateUserAsync(email).ConfigureAwait(false);
            }

            // Set authentication provider
            user.AuthenticationProviderId = "OIDC";

            // Link account with JellyConnect if configured
            if (_jellyConnectClient != null && !string.IsNullOrEmpty(config.JellyConnectUrl))
            {
                try
                {
                    var displayName = result.User?.FindFirst("name")?.Value ?? email;
                    _logger.LogInformation("Linking account in JellyConnect for {Email}", email);
                    
                    var linkRequest = new LinkAccountRequest
                    {
                        Email = email,
                        Username = email,
                        JellyfinUserId = user.Id.ToString(),
                        DisplayName = displayName,
                        Groups = roles.ToArray()
                    };
                    
                    var linkResponse = await _jellyConnectClient.LinkAccountAsync(linkRequest).ConfigureAwait(false);
                    if (linkResponse?.Success == true)
                    {
                        _logger.LogInformation("Account linked successfully in JellyConnect");
                    }
                    else
                    {
                        _logger.LogWarning("Account linking failed in JellyConnect");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "JellyConnect account linking error");
                    // Continue without account linking if it fails
                }
            }

            // Get user policy from JellyConnect
            if (_jellyConnectClient != null && !string.IsNullOrEmpty(config.JellyConnectUrl))
            {
                try
                {
                    _logger.LogInformation("Retrieving user policy from JellyConnect");
                    
                    var policyResponse = await _jellyConnectClient.GetUserPolicyAsync(
                        roles.ToArray(),
                        user.Id.ToString()
                    ).ConfigureAwait(false);
                    
                    if (policyResponse?.Success == true && policyResponse.Data != null)
                    {
                        // Apply role based on policy
                        if (!string.IsNullOrEmpty(policyResponse.Data.Role))
                        {
                            var isAdmin = policyResponse.Data.Role.Equals("admin", StringComparison.OrdinalIgnoreCase);
                            var isPowerUser = policyResponse.Data.Role.Equals("powerUser", StringComparison.OrdinalIgnoreCase);
                            _logger.LogInformation("Policy applied: {Role}", policyResponse.Data.Role);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "JellyConnect policy retrieval error");
                    // Continue without policy retrieval if it fails
                }
            }

            // Set permissions based on groups (fallback if JellyConnect not available)
            var isAdminRole = roles.Any(r => r.Equals("admin", StringComparison.OrdinalIgnoreCase));
            var isPowerUserRole = roles.Any(r => r.Equals("Power User", StringComparison.OrdinalIgnoreCase)) && !isAdminRole;

            _logger.LogInformation("User {Email} authenticated. Admin: {IsAdmin}, PowerUser: {IsPowerUser}", email, isAdminRole, isPowerUserRole);

            // Update user in database
            await _userManager.UpdateUserAsync(user).ConfigureAwait(false);

            StateManager.Remove(stateParam);

            // Redirect to Jellyfin main page
            return Redirect("/");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OIDC callback error");
            return BadRequest("OIDC error: " + ex.Message);
        }
    }

    [HttpPost("token")]
    public async Task<IActionResult> ExchangeToken([FromBody] TokenExchangeRequest request)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null)
        {
            _logger.LogError("Plugin not initialized");
            return BadRequest("Plugin not initialized");
        }

        if (string.IsNullOrEmpty(request?.AccessToken))
        {
            _logger.LogWarning("No access token provided");
            return BadRequest("Access token is required");
        }

        try
        {
            _logger.LogInformation("Processing token exchange request");

            // Validate the token with the OIDC provider using UserInfo endpoint
            var options = new OidcClientOptions
            {
                Authority = config.OidEndpoint?.Trim(),
                ClientId = config.OidClientId?.Trim(),
                ClientSecret = config.OidSecret?.Trim(),
                Scope = string.Join(" ", config.OidScopes)
            };

            var client = new OidcClient(options);
            
            // Use the access token to get user info
            var userInfoResult = await client.GetUserInfoAsync(request.AccessToken).ConfigureAwait(false);
            
            if (userInfoResult.IsError)
            {
                _logger.LogError("Failed to get user info: {Error}", userInfoResult.Error);
                return Unauthorized("Invalid access token");
            }

            // Extract email/username from user info
            var email = userInfoResult.Claims.FirstOrDefault(c => c.Type == "email")?.Value ??
                       userInfoResult.Claims.FirstOrDefault(c => c.Type == "preferred_username")?.Value ??
                       userInfoResult.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;

            if (string.IsNullOrEmpty(email))
            {
                _logger.LogWarning("No email/username found in user info");
                return BadRequest("No email/username found in token");
            }

            // Get roles from claims
            var rolesClaimName = config.RoleClaim ?? "groups";
            var rolesClaimValue = userInfoResult.Claims.FirstOrDefault(c => c.Type == rolesClaimName)?.Value;
            var roles = string.IsNullOrEmpty(rolesClaimValue)
                ? new List<string>()
                : rolesClaimValue.Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries).ToList();

            // Validate token with JellyConnect if configured
            if (_jellyConnectClient != null && !string.IsNullOrEmpty(config.JellyConnectUrl))
            {
                try
                {
                    _logger.LogInformation("Validating token with JellyConnect");
                    
                    var tokenValidationResponse = await _jellyConnectClient.ValidateTokenAsync(
                        request.AccessToken,
                        request.IdToken ?? "",
                        email
                    ).ConfigureAwait(false);
                    
                    if (tokenValidationResponse?.Success == true && tokenValidationResponse.Data != null)
                    {
                        _logger.LogInformation("Token validated with JellyConnect");
                        // Use groups from JellyConnect if available
                        if (tokenValidationResponse.Data.Groups?.Length > 0)
                        {
                            roles = new List<string>(tokenValidationResponse.Data.Groups);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("JellyConnect token validation failed");
                        return Unauthorized("Token validation failed");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "JellyConnect validation error");
                    // Continue without JellyConnect if it fails
                }
            }

            // Get or create user
            var user = _userManager.GetUserByName(email);
            if (user == null)
            {
                if (!config.AutoCreateUser)
                {
                    _logger.LogWarning("User {Email} not found and auto-create is disabled", email);
                    return Unauthorized("User does not exist and auto-creation is disabled");
                }

                _logger.LogInformation("Creating new user from OIDC token: {Email}", email);
                user = await _userManager.CreateUserAsync(email).ConfigureAwait(false);
            }

            // Update user authentication provider
            user.AuthenticationProviderId = "OIDC";

            // Link account with JellyConnect if configured
            if (_jellyConnectClient != null && !string.IsNullOrEmpty(config.JellyConnectUrl))
            {
                try
                {
                    var displayName = userInfoResult.Claims.FirstOrDefault(c => c.Type == "name")?.Value ?? email;
                    _logger.LogInformation("Linking account in JellyConnect");
                    
                    var linkRequest = new LinkAccountRequest
                    {
                        Email = email,
                        Username = email,
                        JellyfinUserId = user.Id.ToString(),
                        DisplayName = displayName,
                        Groups = roles.ToArray()
                    };
                    
                    var linkResponse = await _jellyConnectClient.LinkAccountAsync(linkRequest).ConfigureAwait(false);
                    if (linkResponse?.Success == true)
                    {
                        _logger.LogInformation("Account linked successfully");
                    }
                    else
                    {
                        _logger.LogWarning("Account linking failed in JellyConnect");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Account linking error");
                    // Continue without linking if it fails
                }
            }

            // Get user policy from JellyConnect
            var isAdmin = false;
            var isPowerUser = false;
            if (_jellyConnectClient != null && !string.IsNullOrEmpty(config.JellyConnectUrl))
            {
                try
                {
                    _logger.LogInformation("Retrieving user policy from JellyConnect");
                    
                    var policyResponse = await _jellyConnectClient.GetUserPolicyAsync(
                        roles.ToArray(),
                        user.Id.ToString()
                    ).ConfigureAwait(false);
                    
                    if (policyResponse?.Success == true && policyResponse.Data != null && !string.IsNullOrEmpty(policyResponse.Data.Role))
                    {
                        isAdmin = policyResponse.Data.Role.Equals("admin", StringComparison.OrdinalIgnoreCase);
                        isPowerUser = policyResponse.Data.Role.Equals("powerUser", StringComparison.OrdinalIgnoreCase);
                        _logger.LogInformation("Policy applied: {Role}", policyResponse.Data.Role);
                    }
                    else
                    {
                        // Fallback to group-based role determination
                        isAdmin = roles.Any(r => r.Equals("admin", StringComparison.OrdinalIgnoreCase));
                        isPowerUser = roles.Any(r => r.Equals("Power User", StringComparison.OrdinalIgnoreCase)) && !isAdmin;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Policy retrieval error");
                    // Fallback to group-based role determination
                    isAdmin = roles.Any(r => r.Equals("admin", StringComparison.OrdinalIgnoreCase));
                    isPowerUser = roles.Any(r => r.Equals("Power User", StringComparison.OrdinalIgnoreCase)) && !isAdmin;
                }
            }
            else
            {
                // No JellyConnect configured, use group-based role determination
                isAdmin = roles.Any(r => r.Equals("admin", StringComparison.OrdinalIgnoreCase));
                isPowerUser = roles.Any(r => r.Equals("Power User", StringComparison.OrdinalIgnoreCase)) && !isAdmin;
            }

            _logger.LogInformation("Token exchange for {Email} - Admin: {IsAdmin}, PowerUser: {IsPowerUser}", email, isAdmin, isPowerUser);

            // Update user in database
            await _userManager.UpdateUserAsync(user).ConfigureAwait(false);

            // Return success with user info
            return Ok(new TokenExchangeResponse
            {
                Success = true,
                UserId = user.Id.ToString(),
                Username = user.Username,
                Email = email,
                IsAdmin = isAdmin,
                Message = "User authenticated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token exchange error");
            return StatusCode(500, $"Token exchange failed: {ex.Message}");
        }
    }

    private string GetRedirectUri()
    {
        return $"{Request.Scheme}://{Request.Host}/api/oidc/callback";
    }
}

public class TokenExchangeRequest
{
    public string? AccessToken { get; set; }
    public string? IdToken { get; set; }
}

public class TokenExchangeResponse
{
    public bool Success { get; set; }
    public string? UserId { get; set; }
    public string? Username { get; set; }
    public string? Email { get; set; }
    public bool IsAdmin { get; set; }
    public string? Message { get; set; }
}
