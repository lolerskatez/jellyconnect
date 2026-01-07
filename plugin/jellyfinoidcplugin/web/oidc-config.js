define(['apiClient', 'dashboard'], function (apiClient, dashboard) {
    'use strict';

    const oidcConfigurationPage = {
        pluginUniqueId: '7f8b8d9e-1234-5678-90ab-cdef12345678'
    };

    window.oidcConfigurationPage = oidcConfigurationPage;

    function onPageShow() {
        dashboard.showLoadingMsg();

        apiClient.getPluginConfiguration(oidcConfigurationPage.pluginUniqueId).then(function (config) {
            document.getElementById('txtOidEndpoint').value = config.OidEndpoint || '';
            document.getElementById('txtOidClientId').value = config.OidClientId || '';
            document.getElementById('txtOidSecret').value = config.OidSecret || '';
            document.getElementById('txtRoleClaim').value = config.RoleClaim || 'groups';

            if (config.OidScopes && Array.isArray(config.OidScopes)) {
                document.getElementById('txtOidScopes').value = config.OidScopes.join('\n');
            } else {
                document.getElementById('txtOidScopes').value = 'openid\nprofile\nemail\ngroups';
            }

            dashboard.hideLoadingMsg();
        });
    }

    function onSubmit(e) {
        e.preventDefault();
        dashboard.showLoadingMsg();

        const scopes = document.getElementById('txtOidScopes').value
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const config = {
            OidEndpoint: document.getElementById('txtOidEndpoint').value,
            OidClientId: document.getElementById('txtOidClientId').value,
            OidSecret: document.getElementById('txtOidSecret').value,
            OidScopes: scopes.length > 0 ? scopes : ['openid', 'profile', 'email', 'groups'],
            RoleClaim: document.getElementById('txtRoleClaim').value || 'groups'
        };

        apiClient.updatePluginConfiguration(oidcConfigurationPage.pluginUniqueId, config).then(function (result) {
            dashboard.hideLoadingMsg();
            dashboard.processPluginConfigurationUpdateResult(result);
        });
    }

    document.addEventListener('pageshow', function () {
        const page = document.querySelector('[data-controller*="oidc-config"]');
        if (page) {
            onPageShow();
        }
    });

    document.getElementById('oidcConfigForm').addEventListener('submit', onSubmit);

    return oidcConfigurationPage;
});
