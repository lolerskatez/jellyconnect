# Phase 3 Testing Checklist

**Version:** 1.0  
**Date:** 2024-01-01  
**Phase:** 3 - Web UI Configuration & Dependency Injection  

---

## Overview

This checklist provides a comprehensive testing plan for Phase 3 implementation. Use this to verify all Phase 3 features are working correctly before proceeding to Phase 4.

---

## 1. Unit Tests

### 1.1 JellyConnectApiClient Tests

- [ ] **ValidateTokenAsync works correctly**
  - Setup: Create JellyConnectApiClient with mock HttpClient
  - Test: Call ValidateTokenAsync with valid token
  - Expected: Returns success response with user groups
  - File: `__tests__/JellyConnectApiClient.test.ts`

- [ ] **ValidateTokenAsync handles failures**
  - Setup: Create JellyConnectApiClient with error-returning HttpClient
  - Test: Call ValidateTokenAsync with invalid token
  - Expected: Returns failure response
  - File: `__tests__/JellyConnectApiClient.test.ts`

- [ ] **GetUserPolicyAsync works correctly**
  - Setup: Create JellyConnectApiClient with mock HttpClient
  - Test: Call GetUserPolicyAsync with groups and userId
  - Expected: Returns success response with user policy/role
  - File: `__tests__/JellyConnectApiClient.test.ts`

- [ ] **LinkAccountAsync works correctly**
  - Setup: Create JellyConnectApiClient with mock HttpClient
  - Test: Call LinkAccountAsync with account linking request
  - Expected: Returns success response with linked account
  - File: `__tests__/JellyConnectApiClient.test.ts`

### 1.2 ServiceCollectionExtensions Tests

- [ ] **AddJellyConnectIntegration registers client when URL configured**
  - Setup: Create PluginConfiguration with JellyConnectUrl
  - Test: Call AddJellyConnectIntegration on ServiceCollection
  - Expected: JellyConnectApiClient is registered and can be resolved
  - File: `__tests__/ServiceCollectionExtensions.test.ts`

- [ ] **AddJellyConnectIntegration skips registration when URL not configured**
  - Setup: Create PluginConfiguration without JellyConnectUrl
  - Test: Call AddJellyConnectIntegration on ServiceCollection
  - Expected: JellyConnectApiClient is not registered (returns null)
  - File: `__tests__/ServiceCollectionExtensions.test.ts`

- [ ] **HttpClient is registered correctly**
  - Setup: Create ServiceCollection
  - Test: Call AddHttpClient and verify HttpClient can be resolved
  - Expected: HttpClient factory is registered and working
  - File: `__tests__/ServiceCollectionExtensions.test.ts`

---

## 2. Configuration Tests

### 2.1 Web UI Configuration

- [ ] **JellyConnect URL input field displays**
  - Setup: Open plugin settings page
  - Test: Scroll to "JellyConnect Integration (Optional)" section
  - Expected: Input field with ID="txtJellyConnectUrl" is visible
  - File: `plugin/jellyfinoidcplugin/web/configurationpage.html`

- [ ] **Configuration loads on page load**
  - Setup: Set JellyConnect URL to "https://test.local"
  - Test: Refresh plugin settings page
  - Expected: Previously saved URL appears in input field
  - File: `plugin/jellyfinoidcplugin/web/configurationpage.html`

- [ ] **Configuration saves on submit**
  - Setup: Enter new JellyConnect URL: "https://new-test.local"
  - Test: Click Save button
  - Expected: Configuration is persisted (success message shown)
  - File: `plugin/jellyfinoidcplugin/web/configurationpage.html`

- [ ] **Configuration persists across sessions**
  - Setup: Save JellyConnect URL: "https://persistent.local"
  - Test: Close browser, reopen, navigate to plugin settings
  - Expected: Previously saved URL still appears in input field
  - File: `plugin/JellyfinOIDCPlugin/web/configurationpage.html`

- [ ] **Empty URL is handled gracefully**
  - Setup: Clear JellyConnect URL field (leave empty)
  - Test: Click Save button
  - Expected: Configuration is saved, plugin works without JellyConnect
  - File: `plugin/JellyfinOIDCPlugin/web/configurationpage.html`

- [ ] **Invalid URL format is rejected**
  - Setup: Enter invalid URL: "not-a-url"
  - Test: Click Save button
  - Expected: HTML5 validation error shown (browser warns invalid URL)
  - File: `plugin/JellyfinOIDCPlugin/web/configurationpage.html`

---

## 3. Integration Tests

### 3.1 OIDC Callback Flow

- [ ] **Callback validates token with JellyConnect**
  - Setup: Configure JellyConnect URL, configure OIDC provider
  - Test: Complete OIDC authentication flow
  - Expected: Callback handler calls JellyConnect token validation
  - File: `plugin/JellyfinOIDCPlugin/Controllers/OidcController.cs`
  - Logs: Should see "Validating token with JellyConnect"

- [ ] **Callback extracts groups from JellyConnect response**
  - Setup: Configure JellyConnect with user groups
  - Test: Complete OIDC authentication flow
  - Expected: User account in Jellyfin contains groups from JellyConnect
  - File: `plugin/JellyfinOIDCPlugin/Controllers/OidcController.cs`
  - Verify: Check user details in Jellyfin

- [ ] **Callback creates account when token validates**
  - Setup: Configure JellyConnect, use new user for OIDC
  - Test: Complete OIDC authentication flow with new user
  - Expected: New user account created in Jellyfin
  - File: `plugin/JellyfinOIDCPlugin/Controllers/OidcController.cs`
  - Verify: User appears in Jellyfin Users list

- [ ] **Callback fails when token validation fails**
  - Setup: Configure invalid JellyConnect URL
  - Test: Attempt OIDC authentication flow
  - Expected: Authentication fails, error message shown
  - File: `plugin/JellyfinOIDCPlugin/Controllers/OidcController.cs`
  - Logs: Should see token validation error

### 3.2 Token Exchange Flow

- [ ] **Token exchange validates with JellyConnect**
  - Setup: Complete OIDC login, verify in Jellyfin
  - Test: Request protected resource with valid token
  - Expected: Token exchange calls JellyConnect validation
  - File: `plugin/JellyfinOIDCPlugin/Controllers/OidcController.cs`
  - Logs: Should see "Token exchange initiated"

- [ ] **Token exchange fetches user policy from JellyConnect**
  - Setup: Configure JellyConnect with user policy/role
  - Test: Request protected resource with valid token
  - Expected: Token exchange calls GetUserPolicyAsync
  - File: `plugin/JellyfinOIDCPlugin/Controllers/OidcController.cs`
  - Logs: Should see "Fetching user policy from JellyConnect"

- [ ] **Token exchange applies policy to user**
  - Setup: Configure JellyConnect with user policy
  - Test: Request protected resource with valid token
  - Expected: User policy/role applied to Jellyfin user account
  - File: `plugin/JellyfinOIDCPlugin/Controllers/OidcController.cs`
  - Verify: Check user roles in Jellyfin

- [ ] **Token exchange handles missing policy gracefully**
  - Setup: Configure JellyConnect but don't set user policy
  - Test: Request protected resource with valid token
  - Expected: Authentication succeeds, no policy applied (no error)
  - File: `plugin/JellyfinOIDCPlugin/Controllers/OidcController.cs`
  - Logs: Should see "No policy found for user"

---

## 4. Dependency Injection Tests

### 4.1 Service Registration

- [ ] **HttpClient is registered in DI container**
  - Setup: Create ServiceCollection, call AddHttpClient()
  - Test: Resolve HttpClient from DI container
  - Expected: HttpClient instance is returned
  - File: `plugin/JellyfinOIDCPlugin/Plugin.cs`

- [ ] **JellyConnectApiClient is registered when URL configured**
  - Setup: Create PluginConfiguration with JellyConnect URL
  - Test: Resolve JellyConnectApiClient from DI container
  - Expected: JellyConnectApiClient instance is returned
  - File: `plugin/JellyfinOIDCPlugin/Extensions/ServiceCollectionExtensions.cs`

- [ ] **JellyConnectApiClient is not registered when URL not configured**
  - Setup: Create PluginConfiguration without JellyConnect URL
  - Test: Attempt to resolve JellyConnectApiClient from DI container
  - Expected: Null is returned (gracefully skipped)
  - File: `plugin/JellyfinOIDCPlugin/Extensions/ServiceCollectionExtensions.cs`

- [ ] **JellyConnectApiClient is created with correct parameters**
  - Setup: Create JellyConnectApiClient via DI
  - Test: Verify client is initialized with HttpClient, ILogger, and URL
  - Expected: All parameters are correctly passed to constructor
  - File: `plugin/JellyfinOIDCPlugin/Extensions/ServiceCollectionExtensions.cs`

---

## 5. Compilation Tests

### 5.1 Build Verification

- [ ] **Plugin compiles without errors**
  - Setup: Navigate to plugin directory
  - Test: Run `dotnet build`
  - Expected: Build succeeds with 0 errors
  - File: `plugin/JellyfinOIDCPlugin/JellyfinOIDCPlugin.csproj`
  - Result: ✅ 0 errors, 38 warnings

- [ ] **Release build succeeds**
  - Setup: Navigate to plugin directory
  - Test: Run `dotnet publish -c Release`
  - Expected: Release DLL created in bin/Release/publish/
  - File: `plugin/JellyfinOIDCPlugin/bin/Release/publish/JellyfinOIDCPlugin.v2.dll`
  - Result: ✅ Success

- [ ] **All required dependencies are included**
  - Setup: Check release build output directory
  - Test: Verify required DLL files exist
  - Expected: All dependent DLLs are present
  - Files:
    - [ ] JellyfinOIDCPlugin.v2.dll
    - [ ] IdentityModel.dll
    - [ ] IdentityModel.OidcClient.dll
    - [ ] Microsoft.Extensions.DependencyInjection.dll
    - [ ] Microsoft.Extensions.Logging.dll

- [ ] **No critical compilation errors**
  - Setup: Run `dotnet build`
  - Test: Review error list
  - Expected: 0 errors (warnings acceptable)
  - Result: ✅ 0 errors, 38 warnings (nullable reference types)

---

## 6. End-to-End Tests

### 6.1 Complete SSO Flow

- [ ] **User can log in with OIDC provider**
  - Setup: Configure OIDC provider, JellyConnect URL
  - Test: Click "Login with OIDC Provider" button
  - Expected: Redirected to OIDC provider login
  - Result: ✅ Or ❌ (describe issue)

- [ ] **User is authenticated after OIDC callback**
  - Setup: Complete step 1 above
  - Test: Complete OIDC authentication (enter credentials)
  - Expected: Redirected back to Jellyfin, logged in as user
  - Result: ✅ Or ❌ (describe issue)

- [ ] **User account is created in Jellyfin**
  - Setup: Complete steps 1-2 above with new user
  - Test: Check Jellyfin Users list
  - Expected: New user appears in list
  - Result: ✅ Or ❌ (describe issue)

- [ ] **User account is linked in JellyConnect**
  - Setup: Complete steps 1-3 above
  - Test: Check JellyConnect account linking
  - Expected: User account linked in JellyConnect
  - Result: ✅ Or ❌ (describe issue)

- [ ] **User roles are applied from JellyConnect**
  - Setup: Complete steps 1-4 above
  - Test: Check user details in Jellyfin
  - Expected: User roles/policies from JellyConnect applied
  - Result: ✅ Or ❌ (describe issue)

- [ ] **User can access protected resources**
  - Setup: Complete steps 1-5 above
  - Test: Access protected Jellyfin feature (e.g., library)
  - Expected: User can access resource per applied policies
  - Result: ✅ Or ❌ (describe issue)

---

## 7. Graceful Degradation Tests

### 7.1 Without JellyConnect Configuration

- [ ] **Plugin works without JellyConnect URL**
  - Setup: Leave JellyConnect URL empty in settings
  - Test: Complete OIDC authentication flow
  - Expected: Authentication succeeds without JellyConnect
  - File: `plugin/JellyfinOIDCPlugin/Extensions/ServiceCollectionExtensions.cs`
  - Result: ✅ Or ❌ (describe issue)

- [ ] **No errors when JellyConnect not configured**
  - Setup: Leave JellyConnect URL empty
  - Test: Monitor logs during OIDC flow
  - Expected: No "JellyConnect" errors in logs
  - Result: ✅ Or ❌ (describe issue)

- [ ] **Token validation skips JellyConnect when not configured**
  - Setup: Leave JellyConnect URL empty
  - Test: Complete OIDC authentication flow
  - Expected: Token validation bypasses JellyConnect
  - Result: ✅ Or ❌ (describe issue)

### 7.2 With Unreachable JellyConnect

- [ ] **Plugin gracefully handles unreachable JellyConnect**
  - Setup: Configure invalid JellyConnect URL
  - Test: Attempt OIDC authentication flow
  - Expected: Appropriate error message shown
  - Result: ✅ Or ❌ (describe issue)

- [ ] **Error logs indicate JellyConnect is unreachable**
  - Setup: Configure unreachable JellyConnect URL
  - Test: Monitor logs during OIDC flow
  - Expected: Logs show "JellyConnect unreachable" or similar
  - Result: ✅ Or ❌ (describe issue)

---

## 8. Security Tests

### 8.1 Configuration Security

- [ ] **JellyConnect URL is validated for HTTPS**
  - Setup: Try to save non-HTTPS URL
  - Test: HTML5 validation should apply
  - Expected: URL format validation prevents HTTP (optional)
  - Result: ✅ Or ❌ (describe issue)

- [ ] **Configuration is not exposed in responses**
  - Setup: Complete authentication flow
  - Test: Check API responses for sensitive config
  - Expected: JellyConnect URL not exposed to client
  - Result: ✅ Or ❌ (describe issue)

### 8.2 Token Security

- [ ] **Tokens are validated before use**
  - Setup: Configure JellyConnect validation
  - Test: Attempt to use expired token
  - Expected: Token validation fails, user not authenticated
  - Result: ✅ Or ❌ (describe issue)

- [ ] **Invalid tokens are rejected**
  - Setup: Configure JellyConnect validation
  - Test: Provide malformed/invalid token
  - Expected: JellyConnect rejects token, authentication fails
  - Result: ✅ Or ❌ (describe issue)

---

## 9. Performance Tests

### 9.1 API Response Times

- [ ] **Token validation completes in reasonable time**
  - Setup: Configure JellyConnect, monitor request times
  - Test: Complete OIDC authentication flow
  - Expected: Token validation < 5 seconds
  - Result: _____ seconds

- [ ] **Policy retrieval completes in reasonable time**
  - Setup: Configure JellyConnect, monitor request times
  - Test: Request protected resource
  - Expected: Policy retrieval < 5 seconds
  - Result: _____ seconds

- [ ] **No memory leaks in repeated calls**
  - Setup: Monitor memory usage
  - Test: Perform OIDC authentication 10 times
  - Expected: Memory usage stable, no continuous growth
  - Result: ✅ Or ❌ (describe issue)

---

## 10. Compatibility Tests

### 10.1 Jellyfin Version Compatibility

- [ ] **Plugin works with Jellyfin 10.8.x**
  - Test: Deploy to Jellyfin 10.8.x
  - Expected: Plugin loads and functions correctly
  - Result: ✅ Or ❌ (Jellyfin version: _____)

- [ ] **Plugin works with Jellyfin 10.9.x**
  - Test: Deploy to Jellyfin 10.9.x
  - Expected: Plugin loads and functions correctly
  - Result: ✅ Or ❌ (Jellyfin version: _____)

### 10.2 OIDC Provider Compatibility

- [ ] **Works with Keycloak OIDC provider**
  - Test: Configure Keycloak as OIDC provider
  - Expected: Complete OIDC flow works
  - Result: ✅ Or ❌ (describe issue)

- [ ] **Works with Azure AD OIDC provider**
  - Test: Configure Azure AD as OIDC provider
  - Expected: Complete OIDC flow works
  - Result: ✅ Or ❌ (describe issue)

---

## 11. Documentation Tests

### 11.1 Documentation Completeness

- [ ] **PHASE3_COMPLETION_SUMMARY.md is complete**
  - Test: Review documentation
  - Expected: All Phase 3 tasks documented
  - Result: ✅ Or ❌

- [ ] **PHASE3_DEPLOYMENT_GUIDE.md is accurate**
  - Test: Follow deployment steps
  - Expected: All steps work as documented
  - Result: ✅ Or ❌

- [ ] **Code comments explain Phase 3 changes**
  - Test: Review code comments
  - Expected: All major changes have explanatory comments
  - Result: ✅ Or ❌

---

## Test Summary

### Execution Date: _______________

### Test Results

| Category | Passed | Failed | Skipped | Notes |
|----------|--------|--------|---------|-------|
| Unit Tests | ___ | ___ | ___ | |
| Configuration Tests | ___ | ___ | ___ | |
| Integration Tests | ___ | ___ | ___ | |
| DI Tests | ___ | ___ | ___ | |
| Compilation Tests | ___ | ___ | ___ | |
| E2E Tests | ___ | ___ | ___ | |
| Degradation Tests | ___ | ___ | ___ | |
| Security Tests | ___ | ___ | ___ | |
| Performance Tests | ___ | ___ | ___ | |
| Compatibility Tests | ___ | ___ | ___ | |
| Documentation Tests | ___ | ___ | ___ | |
| **TOTAL** | ___ | ___ | ___ | |

### Overall Result
- [ ] ✅ **All tests passed** - Phase 3 ready for production
- [ ] ⚠️ **Some tests failed** - Issues need fixing (see details below)
- [ ] ❌ **Major tests failed** - Phase 3 not ready

### Failed Tests Summary

List any failed tests here with details:

1. **Test Name:** _________________
   - **Status:** Failed
   - **Details:** _________________
   - **Severity:** High/Medium/Low
   - **Required Fix:** _________________

2. **Test Name:** _________________
   - **Status:** Failed
   - **Details:** _________________
   - **Severity:** High/Medium/Low
   - **Required Fix:** _________________

### Sign-Off

- **Tested by:** _________________
- **Date:** _________________
- **Phase 3 Approved for Production:** ✅ Yes / ❌ No
- **Notes:** _________________

---

**Testing Guide Version:** 1.0  
**Phase 3 Status:** Ready for testing  
**Last Updated:** 2024-01-01
