/**
 * Jellyfin OIDC Login Script
 * Adds SSO login button to the login page
 * This runs globally on all pages to inject the button when the login form appears
 */

(function () {
    'use strict';

    const PLUGIN_ID = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
    const OIDC_START_URL = '/api/oidc/start';
    let injectionAttempts = 0;
    const MAX_ATTEMPTS = 30; // Try for ~15 seconds

    /**
     * Initialize SSO login button
     */
    function initializeSSOButton() {
        if (injectionAttempts >= MAX_ATTEMPTS) {
            console.log('[OIDC] Max injection attempts reached');
            return;
        }

        injectionAttempts++;
        console.log(`[OIDC] Injection attempt ${injectionAttempts}/${MAX_ATTEMPTS}`);

        // Look for login container - try multiple selectors
        const loginContainers = [
            document.querySelector('[data-type="login"]'),
            document.querySelector('.login-page'),
            document.querySelector('[class*="login"]'),
            document.querySelector('form'),
            document.querySelector('[data-role="form"]')
        ];

        let loginForm = null;
        for (const container of loginContainers) {
            if (container && !document.querySelector('.oidc-sso-button')) {
                loginForm = container;
                break;
            }
        }

        if (loginForm) {
            console.log('[OIDC] Login form found, adding SSO button');
            addSSOButton(loginForm);
        } else {
            // Retry after a short delay
            setTimeout(initializeSSOButton, 500);
        }
    }

    /**
     * Add SSO button to login form
     */
    function addSSOButton(loginForm) {
        try {
            // Create container for SSO button
            const ssoContainer = document.createElement('div');
            ssoContainer.className = 'oidc-sso-container';
            ssoContainer.style.cssText = `
                margin: 20px 0;
                padding: 20px 0;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            `;

            // Create SSO button
            const ssoButton = document.createElement('button');
            ssoButton.type = 'button';
            ssoButton.className = 'oidc-sso-button';
            ssoButton.innerHTML = `
                <svg style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                Sign In with SSO
            `;
            ssoButton.style.cssText = `
                display: block;
                width: 100%;
                padding: 12px 16px;
                margin: 0;
                background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0, 102, 204, 0.3);
            `;

            // Hover effect
            ssoButton.addEventListener('mouseenter', () => {
                ssoButton.style.background = 'linear-gradient(135deg, #0052a3 0%, #003d7a 100%)';
                ssoButton.style.boxShadow = '0 4px 8px rgba(0, 102, 204, 0.4)';
            });

            ssoButton.addEventListener('mouseleave', () => {
                ssoButton.style.background = 'linear-gradient(135deg, #0066cc 0%, #0052a3 100%)';
                ssoButton.style.boxShadow = '0 2px 4px rgba(0, 102, 204, 0.3)';
            });

            // Click handler
            ssoButton.addEventListener('click', (e) => {
                e.preventDefault();
                handleSSOLogin();
            });

            // Add separator text
            const separatorDiv = document.createElement('div');
            separatorDiv.style.cssText = `
                text-align: center;
                color: rgba(255, 255, 255, 0.5);
                font-size: 12px;
                margin-top: 20px;
                margin-bottom: 20px;
            `;
            separatorDiv.textContent = 'or continue with traditional login';

            ssoContainer.appendChild(ssoButton);
            ssoContainer.appendChild(separatorDiv);

            // Insert after the login form (before submit button or at the end)
            const submitButton = loginForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.parentNode.insertBefore(ssoContainer, submitButton);
            } else {
                loginForm.appendChild(ssoContainer);
            }

            console.log('OIDC SSO button added to login form');
        } catch (error) {
            console.error('Failed to add OIDC SSO button:', error);
        }
    }

    /**
     * Handle SSO login click
     */
    function handleSSOLogin() {
        try {
            // Show loading indicator
            const ssoButton = document.querySelector('.oidc-sso-button');
            if (ssoButton) {
                ssoButton.disabled = true;
                const originalText = ssoButton.innerHTML;
                ssoButton.innerHTML = `
                    <svg style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="15.7 47.1"/>
                    </svg>
                    Redirecting...
                `;

                // Add CSS animation for spinner
                if (!document.getElementById('oidc-spinner-style')) {
                    const style = document.createElement('style');
                    style.id = 'oidc-spinner-style';
                    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
                    document.head.appendChild(style);
                }
            }

            // Redirect to OIDC start endpoint
            window.location.href = OIDC_START_URL;
        } catch (error) {
            console.error('SSO login error:', error);
            alert('An error occurred while initiating SSO login. Please try again.');
            
            // Re-enable button
            const ssoButton = document.querySelector('.oidc-sso-button');
            if (ssoButton) {
                ssoButton.disabled = false;
            }
        }
    }

    /**
     * Check if SSO is configured and enabled
     */
    async function checkSSOAvailable() {
        try {
            // Try to reach the OIDC start endpoint to verify it exists
            const response = await fetch(OIDC_START_URL, { method: 'HEAD' });
            return response.ok || response.status === 405; // 405 = method not allowed, but endpoint exists
        } catch (error) {
            console.debug('OIDC SSO not available:', error);
            return false;
        }
    }

    /**
     * Initialize on page load
     */
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeSSOButton);
        } else {
            initializeSSOButton();
        }
    }

    // Start initialization
    init();

    // Also watch for dynamic page changes
    const observer = new MutationObserver(() => {
        if (!document.querySelector('.oidc-sso-button')) {
            const form = document.querySelector('form');
            if (form) {
                initializeSSOButton();
            }
        }
    });

    // Start observing when DOM is ready
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true, depth: 3 });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true, depth: 3 });
        });
    }
})();
