#nullable enable

using MediaBrowser.Model.Plugins;

namespace JellyfinOIDCPlugin.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    public PluginConfiguration()
    {
        OidEndpoint = string.Empty;
        OidClientId = string.Empty;
        OidSecret = string.Empty;
        OidScopes = new[] { "openid", "profile", "email", "groups" };
        RoleClaim = "groups";
    }

    public string OidEndpoint { get; set; }

    public string OidClientId { get; set; }

    public string OidSecret { get; set; }

    public string[] OidScopes { get; set; }

    public string RoleClaim { get; set; }

    public string? RedirectUri { get; set; }

    public string? LogoutUri { get; set; }

    public string? CertificatePath { get; set; }

    public bool AutoCreateUser { get; set; } = true;

    public bool AllowRememberMe { get; set; } = true;

    /// <summary>
    /// JellyConnect server URL (e.g., https://jellyconnect.example.com)
    /// </summary>
    public string? JellyConnectUrl { get; set; }
}
