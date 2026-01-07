# Phase 3 Quick Reference Guide

## Overview

Phase 3 completes the Jellyfin OIDC Plugin integration with three remaining tasks:
1. Web UI Configuration
2. Dependency Injection Setup
3. Plugin Build & Test

**Estimated Time**: 1-2 hours
**Complexity**: Low-Medium
**Dependencies**: Phase 1 & 2 complete ✅

---

## Task 1: Web UI Configuration (15 minutes)

### File to Update
```
plugin/JellyfinOIDCPlugin/web/configurationpage.html
```

### What to Add
Add a new form section for JellyConnect URL. Insert before the submit button:

```html
<!-- JellyConnect Configuration Section -->
<div class="form-group">
    <label for="jellyConnectUrl">
        JellyConnect Server URL (Optional)
    </label>
    <input 
        type="url" 
        id="jellyConnectUrl" 
        name="JellyConnectUrl" 
        placeholder="https://jellyconnect.example.com"
        value="<%= config.JellyConnectUrl || '' %>"
        class="form-control"
    />
    <p class="help-text">
        Leave blank to disable JellyConnect integration. 
        When configured, the plugin will validate tokens and link accounts with JellyConnect.
    </p>
</div>
```

### What It Does
- Allows administrators to enter JellyConnect server URL
- Stores value in `PluginConfiguration.JellyConnectUrl` (already added in Phase 2)
- Integration automatically enables when URL is configured

### Verification
- Form field appears in plugin settings
- Value persists after save
- Field is optional (can be left blank)

---

## Task 2: Dependency Injection Setup (10 minutes)

### File to Update
```
plugin/JellyfinOIDCPlugin/Program.cs
```

### Current Structure (Example)
The plugin's `Program.cs` should have a `builder.Services` section. Locate it.

### What to Add
Add after existing service registrations:

```csharp
// Register JellyConnect API Client
builder.Services.AddScoped<JellyConnectApiClient?>(provider =>
{
    var config = Plugin.Instance?.Configuration;
    
    // Only create client if JellyConnect URL is configured
    if (string.IsNullOrWhiteSpace(config?.JellyConnectUrl))
    {
        return null;
    }
    
    var httpClient = provider.GetRequiredService<HttpClient>();
    return new JellyConnectApiClient(httpClient, config.JellyConnectUrl);
});
```

### What It Does
1. Creates `JellyConnectApiClient` instances via dependency injection
2. Only when `JellyConnectUrl` is configured
3. Returns `null` if not configured (optional dependency)
4. Injects into `OidcController` constructor automatically

### Required Imports
Make sure `Program.cs` has:
```csharp
using JellyfinOIDCPlugin.Clients;
using JellyfinOIDCPlugin.Configuration;
```

### Verification
- Plugin builds without errors
- No missing service resolution errors
- `OidcController` receives client instance when configured

---

## Task 3: Plugin Build & Test (45 minutes)

### 3.1 Build the Plugin (5 minutes)

```bash
# From plugin directory
cd plugin/JellyfinOIDCPlugin

# Restore dependencies
dotnet restore

# Build
dotnet build
```

**Expected Output**:
```
Build succeeded with 0 errors
```

**Troubleshooting**:
- Missing imports? Add `using JellyfinOIDCPlugin.Clients;`
- Missing classes? Check `JellyConnectApiClient.cs` exists
- Version mismatches? Check .NET version compatibility

### 3.2 Release Build (5 minutes)

```bash
# Create release build
dotnet publish -c Release -o bin/Release/publish
```

**Output Location**: `bin/Release/publish/`
**Check**: DLL file exists in publish directory

### 3.3 Unit Testing (10 minutes)

If plugin has tests, run them:
```bash
dotnet test
```

If no tests exist, at minimum:
- Verify plugin DLL loads
- Verify configuration loads
- Verify `OidcController` instantiates

### 3.4 Integration Testing (25 minutes)

#### Test 1: Configuration Loading
1. Update plugin configuration with JellyConnect URL
2. Restart plugin
3. **Verify**: Configuration persists and loads

#### Test 2: Client Initialization
1. Start plugin with JellyConnect URL configured
2. Check plugin logs
3. **Verify**: No errors in plugin initialization

#### Test 3: Token Flow (if possible with test OIDC provider)
1. Initiate OIDC login via plugin
2. Check logs for JellyConnect API calls
3. **Verify**: 
   - Token validation attempted
   - Account linking attempted
   - Policies retrieved
   - No unhandled exceptions

#### Test 4: Graceful Degradation
1. Temporarily make JellyConnect URL unreachable
2. Attempt OIDC login
3. **Verify**: 
   - Plugin logs error
   - User still authenticates
   - Fallback to local roles

#### Test 5: Without JellyConnect
1. Leave JellyConnect URL blank
2. Attempt OIDC login
3. **Verify**: 
   - Plugin works normally
   - No JellyConnect API calls
   - Local group-based roles applied

---

## Testing Checklist

### ✅ Build Tests
- [ ] `dotnet build` succeeds (0 errors)
- [ ] `dotnet publish -c Release` succeeds
- [ ] DLL file created in publish directory
- [ ] No missing dependencies

### ✅ Unit Tests
- [ ] Any existing tests pass
- [ ] Configuration loads correctly
- [ ] Classes instantiate without errors

### ✅ Integration Tests
- [ ] Plugin configuration persists
- [ ] JellyConnect API calls execute
- [ ] Token validation works
- [ ] Account linking works
- [ ] Policy retrieval works
- [ ] Error handling triggers correctly
- [ ] Plugin degrades gracefully

### ✅ Functional Tests
- [ ] OIDC login flow works
- [ ] User created in Jellyfin
- [ ] User linked in JellyConnect
- [ ] Policies applied correctly
- [ ] Roles assigned correctly

---

## Troubleshooting Guide

### Build Errors

#### "Missing namespace JellyfinOIDCPlugin.Clients"
**Solution**: Ensure `JellyConnectApiClient.cs` file exists in `Clients/` directory

#### "Missing type JellyConnectApiClient"
**Solution**: Check `JellyConnectApiClient.cs` is in correct location:
```
plugin/JellyfinOIDCPlugin/Clients/JellyConnectApiClient.cs
```

#### "DI registration fails"
**Solution**: Check `Program.cs` has correct namespaces:
```csharp
using JellyfinOIDCPlugin.Clients;
using JellyfinOIDCPlugin.Configuration;
```

### Runtime Errors

#### "Plugin fails to start"
**Check**:
1. Plugin DLL loads correctly
2. No missing dependencies
3. Configuration format is valid
4. Check Jellyfin logs for details

#### "JellyConnect API calls timeout"
**Check**:
1. JellyConnect URL is correct
2. JellyConnect server is running
3. Network connectivity between plugin and JellyConnect
4. No firewall blocking requests

#### "Account not linking"
**Check**:
1. JellyConnect API returns successful response
2. Email in token matches JellyConnect user
3. Database permissions allow updates
4. Check error logs in both plugin and JellyConnect

### Configuration Issues

#### "Settings not persisting"
**Check**:
1. Configuration property name matches HTML input `name` attribute
2. `PluginConfiguration.cs` has public property
3. Configuration manager is serializing correctly

#### "JellyConnect integration not activating"
**Check**:
1. URL is properly configured in plugin settings
2. URL is not empty or whitespace
3. Check condition in code: `!string.IsNullOrEmpty(config.JellyConnectUrl)`

---

## Quick Commands Reference

```bash
# Navigate to plugin directory
cd plugin/JellyfinOIDCPlugin

# Restore dependencies
dotnet restore

# Build for development
dotnet build

# Build for release
dotnet publish -c Release

# Run tests (if available)
dotnet test

# Clean build artifacts
dotnet clean
```

---

## Verification Checklist

After completing Phase 3, verify:

### Build
- [ ] No compilation errors
- [ ] No compilation warnings
- [ ] DLL file created successfully
- [ ] All dependencies resolved

### Configuration
- [ ] JellyConnect URL field appears in web UI
- [ ] Configuration value persists
- [ ] Configuration loads on plugin startup

### Dependency Injection
- [ ] `JellyConnectApiClient` registered in DI container
- [ ] `OidcController` receives client instance
- [ ] Client is null when URL not configured

### Testing
- [ ] Unit tests pass (if available)
- [ ] Plugin instantiates without errors
- [ ] API calls work as expected
- [ ] Error handling triggers correctly
- [ ] Graceful degradation works

### Integration
- [ ] OIDC login flow works end-to-end
- [ ] Users created in Jellyfin
- [ ] Accounts linked in JellyConnect
- [ ] Policies applied correctly
- [ ] Roles synchronized

---

## Next Steps After Phase 3

Once Phase 3 is complete:

1. **Deployment**
   - Package plugin for distribution
   - Deploy to production Jellyfin instance

2. **Monitoring**
   - Monitor plugin logs
   - Verify API calls are working
   - Check account linking success rate

3. **User Testing**
   - Test with real OIDC provider
   - Verify complete SSO flow
   - Check account synchronization

4. **Documentation**
   - Create deployment guide
   - Document configuration steps
   - Create troubleshooting guide

5. **Release**
   - Publish plugin to Jellyfin plugin repository
   - Create release notes
   - Document version compatibility

---

## Resources

### Documentation
- `PLUGIN_CONTROLLER_UPDATE.md` - Controller implementation details
- `PLUGIN_INTEGRATION_GUIDE.md` - Full integration instructions
- `PLUGIN_SSO_README.md` - Architecture and features

### Code References
- `OidcController.cs` - Controller with JellyConnect integration
- `JellyConnectApiClient.cs` - C# client library
- `PluginConfiguration.cs` - Configuration structure

### Testing
- Check plugin logs in: `jellyfin-logs/` directory
- Check JellyConnect logs in: JellyConnect app logs
- Use curl to test API endpoints directly

---

## Success Criteria

Phase 3 is complete when:

✅ Web UI displays JellyConnect URL field
✅ DI container registers client correctly
✅ Plugin builds without errors
✅ Integration tests pass
✅ End-to-end SSO works
✅ Accounts link with JellyConnect
✅ Policies apply correctly

---

**Status**: Ready for Phase 3 Implementation
**Estimated Completion**: 1-2 hours
**Next Action**: Implement Web UI configuration
