/**
 * Global OIDC Injector
 * This script runs globally and ensures the SSO button is injected on all pages
 * It uses localStorage to remember it has been loaded and injects on every page
 */
(function() {
    'use strict';
    
    console.log('[OIDC Global Injector] Started');
    
    // Mark this as globally active in localStorage
    try {
        localStorage.setItem('oidc_plugin_active', 'true');
        localStorage.setItem('oidc_last_injection', new Date().toISOString());
    } catch(e) {
        console.warn('[OIDC Global Injector] localStorage not available:', e);
    }
    
    // Function to inject the login script
    function injectLoginScript() {
        if (window.OidcLoginScriptInjected) {
            console.log('[OIDC Global Injector] Login script already injected');
            return;
        }
        
        console.log('[OIDC Global Injector] Injecting login script');
        
        var script = document.createElement('script');
        script.type = 'application/javascript';
        script.async = true;
        script.src = '/api/oidc/login.js?v=' + Date.now();
        
        script.onload = function() {
            console.log('[OIDC Global Injector] Login script loaded');
            window.OidcLoginScriptInjected = true;
        };
        
        script.onerror = function() {
            console.error('[OIDC Global Injector] Failed to load login.js');
            // Retry in 2 seconds
            setTimeout(injectLoginScript, 2000);
        };
        
        document.head.appendChild(script);
    }
    
    // Inject immediately
    injectLoginScript();
    
    // Also watch for page changes (in case of SPA navigation)
    var lastUrl = location.href;
    new MutationObserver(function() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log('[OIDC Global Injector] URL changed, re-checking for SSO button');
            // The oidc-login.js script should handle this via MutationObserver
        }
    }).observe(document, { subtree: true, childList: true });
    
    console.log('[OIDC Global Injector] Initialization complete');
})();
