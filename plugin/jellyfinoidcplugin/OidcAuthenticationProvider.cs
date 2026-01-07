using System;
using System.Threading.Tasks;
using Jellyfin.Database.Implementations.Entities;
using MediaBrowser.Controller.Authentication;
using Microsoft.Extensions.Logging;

namespace JellyfinOIDCPlugin;

/// <summary>
/// OIDC Authentication Provider for Jellyfin
/// Enables web-based OAuth2/OIDC authentication flow
/// </summary>
public class OidcAuthenticationProvider : IAuthenticationProvider
{
    private readonly ILogger<OidcAuthenticationProvider> _logger;

    public OidcAuthenticationProvider(ILogger<OidcAuthenticationProvider> logger)
    {
        _logger = logger;
    }

    public string Name => "OIDC";

    /// <summary>
    /// OIDC provider is always enabled when the plugin is loaded
    /// </summary>
    public bool IsEnabled => true;

    public Task<ProviderAuthenticationResult> Authenticate(string username, string password)
    {
        _logger.LogError("Direct authentication not supported for OIDC provider. Use web-based OAuth flow via /api/oidc/start");
        throw new AuthenticationException("OIDC authentication requires web-based OAuth flow. Please use the SSO button on the login page.");
    }

    public Task ChangePassword(User user, string newPassword)
    {
        _logger.LogWarning("Password changes not supported for OIDC-authenticated users");
        throw new NotSupportedException("Password management is not available for OIDC users. Change your password in your OIDC provider instead.");
    }

    public bool HasPassword(User user)
    {
        return false;
    }
}
