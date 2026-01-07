#nullable enable

using System;
using System.Net.Http;
using JellyfinOIDCPlugin.Clients;
using JellyfinOIDCPlugin.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace JellyfinOIDCPlugin.Extensions;

/// <summary>
/// Extension methods for registering JellyConnect integration services
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers JellyConnect API client if configured
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddJellyConnectIntegration(this IServiceCollection services)
    {
        services.AddScoped<JellyConnectApiClient?>(provider =>
        {
            // Get the plugin configuration
            var config = Plugin.Instance?.Configuration;
            
            // Only create client if JellyConnect URL is configured
            if (string.IsNullOrWhiteSpace(config?.JellyConnectUrl))
            {
                return null;
            }
            
            // Create and return the client with HttpClient and Logger
            var httpClient = provider.GetRequiredService<HttpClient>();
            var logger = provider.GetRequiredService<ILogger<JellyConnectApiClient>>();
            return new JellyConnectApiClient(httpClient, logger, config.JellyConnectUrl);
        });
        
        return services;
    }
}
