// Jellyfin OIDC Login Injector
// This script loads the OIDC login functionality into the login page

(function() {
    'use strict';

    function injectOidcScript() {
        // Check if script is already loaded
        if (window.OidcLoginLoaded) {
            return;
        }

        // Try to load the actual login script
        const script = document.createElement('script');
        script.src = '/api/oidc/login.js?v=' + Date.now();
        script.type = 'text/javascript';
        script.async = true;
        script.onload = function() {
            console.log('[OIDC] Login script loaded successfully');
            window.OidcLoginLoaded = true;
        };
        script.onerror = function() {
            console.warn('[OIDC] Failed to load login script, retrying...');
            setTimeout(injectOidcScript, 2000);
        };

        document.head.appendChild(script);
    }

    // Start loading when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectOidcScript);
    } else {
        injectOidcScript();
    }

    // Retry on page visibility change
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && !window.OidcLoginLoaded) {
            setTimeout(injectOidcScript, 500);
        }
    });
})();
