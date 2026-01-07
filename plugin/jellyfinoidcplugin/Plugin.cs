#nullable enable

using System;
using System.Collections.Generic;
using JellyfinOIDCPlugin.Configuration;
using JellyfinOIDCPlugin.Extensions;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.DependencyInjection;

namespace JellyfinOIDCPlugin;

public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public override string Name => "OIDC Authentication";

    public override Guid Id => Guid.Parse("a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6");

    public static Plugin? Instance { get; private set; }

    public IEnumerable<PluginPageInfo> GetPages()
    {
        return new[]
        {
            new PluginPageInfo
            {
                Name = Name,
                EmbeddedResourcePath = "JellyfinOIDCPlugin.web.configurationpage.html"
            }
        };
    }

    /// <summary>
    /// Registers plugin services with the dependency injection container
    /// </summary>
    /// <param name="services">The service collection</param>
    public void RegisterServices(IServiceCollection services)
    {
        // Register HttpClient for JellyConnect API calls
        services.AddHttpClient();
        
        // Register JellyConnect integration (conditional on configuration)
        services.AddJellyConnectIntegration();
    }
}
