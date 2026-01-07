// Jellyfin OIDC Global Loader - Runs on EVERY page
// Self-bootstrapping script that loads and injects the OIDC login button
(function() {
    'use strict';
    
    console.log('[OIDC Loader] Initializing...');
    
    // Check if already loaded
    if (window.OidcLoaderActive) {
        console.log('[OIDC Loader] Already active');
        return;
    }
    window.OidcLoaderActive = true;
    
    // Load the main login script
    function loadLoginScript() {
        const script = document.createElement('script');
        script.src = '/api/oidc/login.js?v=' + Date.now();
        script.type = 'text/javascript';
        script.async = true;
        script.onerror = function() {
            console.warn('[OIDC Loader] Failed to load login script, retrying...');
            setTimeout(loadLoginScript, 2000);
        };
        script.onload = function() {
            console.log('[OIDC Loader] Login script loaded successfully');
        };
        
        document.head.appendChild(script);
        console.log('[OIDC Loader] Appended login script to head');
    }
    
    // Load when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadLoginScript);
    } else {
        loadLoginScript();
    }
})();
