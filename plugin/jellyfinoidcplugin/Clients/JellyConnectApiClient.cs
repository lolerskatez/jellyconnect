/**
 * JellyConnect API Client for Jellyfin OIDC Plugin
 * 
 * This file provides a client library for the Jellyfin OIDC Plugin to communicate
 * with JellyConnect API endpoints for account linking and user management.
 * 
 * TO BE USED IN: plugin/jellyfinoidcplugin/
 */

namespace JellyfinOIDCPlugin.Clients;

using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

/// <summary>
/// Client for communicating with JellyConnect API
/// Handles token validation, account linking, and policy retrieval
/// </summary>
public class JellyConnectApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<JellyConnectApiClient> _logger;
    private readonly string _jellyConnectUrl;

    public JellyConnectApiClient(HttpClient httpClient, ILogger<JellyConnectApiClient> logger, string jellyConnectUrl)
    {
        _httpClient = httpClient;
        _logger = logger;
        _jellyConnectUrl = jellyConnectUrl?.TrimEnd('/');
    }

    /// <summary>
    /// Validates OIDC token with JellyConnect API
    /// </summary>
    public async Task<TokenValidationResponse?> ValidateTokenAsync(string accessToken, string idToken, string email)
    {
        try
        {
            var request = new TokenValidationRequest
            {
                AccessToken = accessToken,
                IdToken = idToken,
                Email = email
            };

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_jellyConnectUrl}/api/plugin/validate-token", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Token validation failed with status {StatusCode}", response.StatusCode);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var apiResponse = JsonSerializer.Deserialize<ApiResponse<TokenValidationData>>(responseJson);

            if (apiResponse?.Success != true || apiResponse.Data == null)
            {
                _logger.LogError("Token validation returned unsuccessful response");
                return null;
            }

            _logger.LogInformation("Token validation successful for email: {Email}", email);
            return new TokenValidationResponse
            {
                Success = true,
                Data = apiResponse.Data
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating token with JellyConnect");
            return null;
        }
    }

    /// <summary>
    /// Links a Jellyfin user account to JellyConnect
    /// </summary>
    public async Task<LinkAccountResponse?> LinkAccountAsync(LinkAccountRequest request)
    {
        try
        {
            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_jellyConnectUrl}/api/plugin/link-account", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Account linking failed with status {StatusCode}", response.StatusCode);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var apiResponse = JsonSerializer.Deserialize<ApiResponse<LinkAccountData>>(responseJson);

            if (apiResponse?.Success != true || apiResponse.Data == null)
            {
                _logger.LogError("Account linking returned unsuccessful response");
                return null;
            }

            _logger.LogInformation("Account linked successfully for email: {Email}", request.Email);
            return new LinkAccountResponse
            {
                Success = true,
                Data = apiResponse.Data
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error linking account with JellyConnect");
            return null;
        }
    }

    /// <summary>
    /// Gets user policy based on groups
    /// </summary>
    public async Task<PolicyResponse?> GetUserPolicyAsync(string[] groups, string userId = null)
    {
        try
        {
            var request = new PolicyRequest
            {
                Groups = groups,
                UserId = userId
            };

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_jellyConnectUrl}/api/plugin/get-user-policy", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Policy retrieval failed with status {StatusCode}", response.StatusCode);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var apiResponse = JsonSerializer.Deserialize<ApiResponse<PolicyData>>(responseJson);

            if (apiResponse?.Success != true || apiResponse.Data == null)
            {
                _logger.LogError("Policy retrieval returned unsuccessful response");
                return null;
            }

            _logger.LogInformation("Policy retrieved successfully");
            return new PolicyResponse
            {
                Success = true,
                Data = apiResponse.Data
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user policy from JellyConnect");
            return null;
        }
    }

    /// <summary>
    /// Checks health of JellyConnect API
    /// </summary>
    public async Task<bool> HealthCheckAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_jellyConnectUrl}/api/plugin/health");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking JellyConnect health");
            return false;
        }
    }
}

// Request/Response Models
public class TokenValidationRequest
{
    public string? AccessToken { get; set; }
    public string? IdToken { get; set; }
    public string? Email { get; set; }
}

public class TokenValidationResponse
{
    public bool Success { get; set; }
    public TokenValidationData? Data { get; set; }
}

public class TokenValidationData
{
    public string? UserId { get; set; }
    public string? JellyfinId { get; set; }
    public string? Email { get; set; }
    public string? Username { get; set; }
    public string? DisplayName { get; set; }
    public string[]? Groups { get; set; }
    public string[]? Roles { get; set; }
    public bool Exists { get; set; }
}

public class LinkAccountRequest
{
    public string? Email { get; set; }
    public string? Username { get; set; }
    public string? JellyfinUserId { get; set; }
    public string? DisplayName { get; set; }
    public string[]? Groups { get; set; }
    public string? AccessToken { get; set; }
}

public class LinkAccountResponse
{
    public bool Success { get; set; }
    public LinkAccountData? Data { get; set; }
}

public class LinkAccountData
{
    public string? UserId { get; set; }
    public string? Email { get; set; }
    public string? JellyfinId { get; set; }
    public bool Linked { get; set; }
}

public class PolicyRequest
{
    public string[]? Groups { get; set; }
    public string? UserId { get; set; }
    public string? Email { get; set; }
}

public class PolicyResponse
{
    public bool Success { get; set; }
    public PolicyData? Data { get; set; }
}

public class PolicyData
{
    public string? Role { get; set; }
    public object? Policy { get; set; }
    public string[]? Groups { get; set; }
}

// Generic API Response wrapper
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    public string? Message { get; set; }
    public int StatusCode { get; set; }
    public string? Timestamp { get; set; }
}
