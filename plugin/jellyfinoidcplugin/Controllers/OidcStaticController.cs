using System;
using System.IO;
using System.Reflection;
using MediaBrowser.Common.Plugins;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace JellyfinOIDCPlugin.Controllers;

[ApiController]
[Route("api/oidc")]
public class OidcStaticController : ControllerBase
{
    private readonly ILogger<OidcStaticController> _logger;

    public OidcStaticController(ILogger<OidcStaticController> logger)
    {
        _logger = logger;
    }

    [HttpGet("login.js")]
    public IActionResult GetLoginScript()
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("JellyfinOIDCPlugin.web.oidc-login.js");
            if (stream == null)
            {
                _logger.LogWarning("Login script resource not found");
                return NotFound();
            }

            using var reader = new StreamReader(stream);
            var content = reader.ReadToEnd();
            
            return Content(content, "application/javascript");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving login script");
            return StatusCode(500, "Error loading login script");
        }
    }

    [HttpGet("loader.js")]
    public IActionResult GetLoader()
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("JellyfinOIDCPlugin.web.oidc-loader.js");
            if (stream == null)
            {
                _logger.LogWarning("Loader script resource not found");
                return NotFound();
            }

            using var reader = new StreamReader(stream);
            var content = reader.ReadToEnd();
            
            return Content(content, "application/javascript");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving loader script");
            return StatusCode(500, "Error loading loader script");
        }
    }

    [HttpGet("inject")]
    public IActionResult GetInject()
    {
        try
        {
            // This endpoint serves an auto-executing inline bootstrap script
            // that will inject the OIDC login button on any page that loads it
            var script = @"
(function() {
    console.log('[OIDC Plugin] Bootstrap inject started');
    
    // Load oidc-loader.js dynamically
    const loaderScript = document.createElement('script');
    loaderScript.src = '/api/oidc/loader.js';
    loaderScript.type = 'application/javascript';
    loaderScript.onerror = function() {
        console.error('[OIDC Plugin] Failed to load loader.js');
    };
    loaderScript.onload = function() {
        console.log('[OIDC Plugin] Loader.js loaded successfully');
    };
    
    // Append to head or body
    const target = document.head || document.documentElement;
    target.appendChild(loaderScript);
    
    console.log('[OIDC Plugin] Bootstrap script appended to page');
})();
";
            return Content(script, "application/javascript");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving inject script");
            return StatusCode(500, "Error loading inject script");
        }
    }

    [HttpGet("global.js")]
    public IActionResult GetGlobalInjector()
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("JellyfinOIDCPlugin.web.oidc-global-injector.js");
            if (stream == null)
            {
                _logger.LogWarning("Global injector resource not found");
                return NotFound();
            }

            using var reader = new StreamReader(stream);
            var content = reader.ReadToEnd();
            
            return Content(content, "application/javascript");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving global injector");
            return StatusCode(500, "Error loading global injector");
        }
    }

    [HttpGet("config")]
    public IActionResult GetConfigurationPage()
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("JellyfinOIDCPlugin.web.configurationpage.html");
            if (stream == null)
            {
                _logger.LogWarning("Configuration page resource not found");
                return NotFound("Configuration page resource not found");
            }

            using var reader = new StreamReader(stream);
            var content = reader.ReadToEnd();
            
            return Content(content, "text/html");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving configuration page");
            return StatusCode(500, $"Error loading configuration page: {ex.Message}");
        }
    }
}
