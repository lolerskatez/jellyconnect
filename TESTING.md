# Testing Guide

This guide covers testing JellyConnect functionality, from unit tests to end-to-end integration tests.

## Unit Tests

Run Jest unit tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test ErrorBoundary
```

### Current Test Coverage

- **ErrorBoundary**: Component error handling and recovery
- **Notification Service**: Email and Discord notification delivery

### Running Tests

```bash
npm test

# Watch mode for development
npm test:watch

# Generate coverage report
npm test -- --coverage --collectCoverageFrom="app/**/*.{ts,tsx}" --collectCoverageFrom="lib/**/*.{ts,tsx}" --collectCoverageFrom="components/**/*.{ts,tsx}"
```

## Manual Testing

### Prerequisites

- Running Jellyfin server on `http://localhost:8096`
- OIDC provider accessible (Authentik, Keycloak, etc.)
- SMTP server for email notifications (optional)
- Discord webhook/bot (optional)

### Start Test Servers

**Terminal 1: Admin System**
```bash
npm run dev:admin
# Server: http://localhost:3000
```

**Terminal 2: Public System (Optional)**
```bash
npm run dev:public
# Server: http://localhost:3001
```

## Admin System Testing

### 1. Initial Setup

- [ ] Navigate to `http://localhost:3000`
- [ ] Should redirect to setup page
- [ ] Enter Jellyfin URL: `http://localhost:8096`
- [ ] Enter admin username and password
- [ ] Click "Save Configuration"
- [ ] Page should redirect to `/login`

**Expected Result:** Configuration saved successfully, API key generated

### 2. SSO Authentication

- [ ] Navigate to `http://localhost:3000/login`
- [ ] Click "Sign in with SSO"
- [ ] Should redirect to OIDC provider login page
- [ ] Enter OIDC credentials
- [ ] Should redirect back to `http://localhost:3000/auth/callback/complete`
- [ ] Should be redirected to home page (`/`)
- [ ] User info should display in top-right corner

**Expected Result:** Authenticated as admin, session visible

### 3. User Management

**Create User:**
- [ ] Navigate to `/users`
- [ ] Click "Create User"
- [ ] Enter username, email, password
- [ ] Click "Create"
- [ ] User should appear in user list
- [ ] Jellyfin server should have new user

**List Users:**
- [ ] Navigate to `/users`
- [ ] All Jellyfin users should display
- [ ] Each user shows email and role

**Edit User:**
- [ ] Click on a user in the list
- [ ] Edit email or contact info
- [ ] Save changes
- [ ] Changes should persist on reload

**Delete User:**
- [ ] Click on a user
- [ ] Click "Delete" button
- [ ] Confirm deletion
- [ ] User should be removed from list and Jellyfin

### 4. Invite Management

**Create Invite:**
- [ ] Navigate to `/invites`
- [ ] Click "Create Invite"
- [ ] Select profile (admin/user)
- [ ] Set usage limit
- [ ] Click "Create"
- [ ] Invite code should display
- [ ] Copy code

**List Invites:**
- [ ] Navigate to `/invites`
- [ ] All invites should display
- [ ] Show usage count and status
- [ ] Show creation date

**Manage Invites:**
- [ ] Click on an invite to view details
- [ ] Edit profile or limits
- [ ] Revoke invite (usage should reset)
- [ ] Delete invite

### 5. Notification System

**In-App Notifications:**
- [ ] Click notification bell icon
- [ ] Should show notification panel
- [ ] Can clear individual notifications
- [ ] Can clear all notifications

**Email Notifications:**
(Requires SMTP configuration)
- [ ] Go to Settings
- [ ] Configure SMTP
- [ ] Go to Notifications page
- [ ] Send test email
- [ ] Should receive email

**Discord Notifications:**
(Requires Discord bot)
- [ ] Go to Settings
- [ ] Configure Discord bot token
- [ ] Go to Notifications page
- [ ] Send test message
- [ ] Should see message in Discord

### 6. Account Expiry

**Set Expiry Date:**
- [ ] Navigate to `/users`
- [ ] Click on a user
- [ ] Click "Account Expiry" tab
- [ ] Set expiry date to 7 days from now
- [ ] Save

**View Expiring Users:**
- [ ] Navigate to `/expiry`
- [ ] User should appear in list
- [ ] Shows days until expiry
- [ ] Click to view details

**Trigger Expiry Check:**
- [ ] Navigate to `/expiry`
- [ ] Click "Trigger Expiry Check"
- [ ] Should send notifications to expiring users

### 7. Settings

**OIDC Provider Configuration:**
- [ ] Navigate to Settings
- [ ] Go to Authentication tab
- [ ] Enable OIDC
- [ ] Enter provider details:
  - Provider Name
  - Client ID
  - Client Secret
  - Issuer URL
- [ ] Click "Test Provider"
- [ ] Should show successful connection

**SMTP Configuration:**
- [ ] Navigate to Settings
- [ ] Go to Email tab
- [ ] Enter SMTP details
- [ ] Click "Test SMTP"
- [ ] Should show connection success

**Discord Configuration:**
- [ ] Navigate to Settings
- [ ] Go to Discord tab
- [ ] Enter bot token
- [ ] Click "Test Discord"
- [ ] Should show connection success

### 8. Quick Connect

**Initiate Quick Connect:**
- [ ] Navigate to `/quickconnect`
- [ ] Click "Initiate Quick Connect"
- [ ] Should show code
- [ ] Code should update every 5 seconds

**Approve Session:**
- [ ] While Quick Connect is running
- [ ] Code should appear on home page modal
- [ ] Click "Approve Session"
- [ ] Modal should close
- [ ] Session should be created

### 9. Logout

- [ ] Click logout button (top-right)
- [ ] Should redirect to `/login`
- [ ] Session should be cleared
- [ ] Cannot access protected pages
- [ ] Cookie should be deleted

**Expected Result:** Successfully logged out, session terminated

## Public System Testing

### 1. Public Registration Flow

**With Invite:**
- [ ] Navigate to `http://localhost:3001/register`
- [ ] Enter invite code (from admin system)
- [ ] Click validate
- [ ] Form should display for user details
- [ ] Enter email, username, password
- [ ] Click "Register"
- [ ] Should redirect to login
- [ ] User should exist in Jellyfin

**Without Invite:**
- [ ] Try to register without code
- [ ] Should show "Invalid invite code"

### 2. Public Login

**Manual Login:**
- [ ] Navigate to `http://localhost:3001/login`
- [ ] Enter username and password
- [ ] Click "Login"
- [ ] Should redirect to home
- [ ] User info should display

**SSO Login:**
- [ ] Navigate to `http://localhost:3001/login`
- [ ] Click "Sign in with SSO"
- [ ] Should redirect to OIDC provider
- [ ] After login, should auto-create user
- [ ] Should redirect to home
- [ ] User session should be active

### 3. Public Features

**View Jellyfin Content:**
- [ ] Home page should display available content
- [ ] Quick Connect section should work

**User Settings:**
- [ ] Navigate to `/user-settings`
- [ ] Update email/discord
- [ ] Save changes
- [ ] Changes should persist

**Notifications:**
- [ ] Navigate to `/notifications`
- [ ] View notification preferences
- [ ] Enable/disable notification types
- [ ] Save preferences

## API Testing

### Using curl

```bash
# Setup endpoint
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{"jellyfinUrl":"http://localhost:8096","apiKey":"key"}'

# Auth endpoints
curl http://localhost:3000/api/auth/status

# User endpoints
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer token"

# Invite endpoints
curl -X POST http://localhost:3000/api/invites \
  -H "Content-Type: application/json" \
  -d '{"profile":"admin","usageLimit":5}'
```

### Using Postman

1. Import OpenAPI spec (if available)
2. Create collection with endpoints
3. Set environment variables
4. Test each endpoint
5. Verify response codes and data

## Cross-Browser Testing

Test in multiple browsers:

- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

**Test Scenarios:**
- [ ] SSO login flow
- [ ] Responsive design
- [ ] Form submission
- [ ] Cookie handling
- [ ] Notification display
- [ ] Session persistence

## Performance Testing

### Load Testing

Using Apache Bench:

```bash
# Single request
ab -n 1 -c 1 http://localhost:3000/

# 100 requests with 10 concurrent
ab -n 100 -c 10 http://localhost:3000/

# With results
ab -n 1000 -c 50 -g results.txt http://localhost:3000/
```

### Memory Usage

```bash
# Monitor Node process
ps aux | grep node

# Check memory in real-time
watch -n 1 'ps aux | grep node | grep -v grep'
```

### Network Performance

Using browser DevTools:

1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Check:
   - Page load time
   - Resource sizes
   - Slow requests
   - Waterfall diagram

## Security Testing

### Authentication Bypass

- [ ] Try to access `/users` without login
  - Should redirect to `/login`
- [ ] Try to access with invalid token
  - Should return 401
- [ ] Try to modify cookie
  - Session should fail

### CSRF Protection

- [ ] Form submissions should work normally
- [ ] Cross-site form submissions should fail

### XSS Protection

- [ ] Try to inject `<script>` in user input
- [ ] Should be sanitized/escaped
- [ ] No JavaScript execution

### OIDC Flow Security

- [ ] State parameter should match
- [ ] PKCE should be used (if supported)
- [ ] Nonce should be verified
- [ ] Token expiry should be enforced

## Accessibility Testing

### Keyboard Navigation

- [ ] Tab through all interactive elements
- [ ] Tab order should be logical
- [ ] All buttons should be reachable
- [ ] Forms should be submittable via keyboard

### Screen Reader

Test with screen reader (Windows Narrator, NVDA, JAWS):

- [ ] Page structure is announced correctly
- [ ] Buttons have labels
- [ ] Form inputs have labels
- [ ] Errors are announced

### Color Contrast

Use accessibility checker:

```bash
# Using npm package
npm install -g pa11y
pa11y http://localhost:3000
```

## Continuous Integration

Tests run on every commit:

```bash
# GitHub Actions, GitLab CI, Jenkins, etc.
# Run unit tests
npm test -- --coverage

# Run linting
npm run lint

# Build check
npm run build
```

## Test Results Reporting

### Coverage Goals

- Lines: > 70%
- Branches: > 60%
- Functions: > 70%
- Statements: > 70%

### View Coverage

```bash
npm test -- --coverage
# Open coverage/lcov-report/index.html in browser
```

## Common Issues

### Tests failing locally but passing in CI

- Check Node version matches
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `npm test -- --clearCache`

### Flaky tests

- Increase timeout: `jest.setTimeout(10000)`
- Mock external services
- Use `waitFor` for async operations

### Database state issues

- Reset database between tests
- Use separate test database
- Clean up after each test

## Debugging Tests

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/jest/bin/jest.js",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

### Run single test

```bash
npm test -- ErrorBoundary -t "should render children"
```

### View test output

```bash
npm test -- --verbose
```

## Checklist Before Release

- [ ] All unit tests passing
- [ ] Manual testing completed
- [ ] Cross-browser tested
- [ ] Performance acceptable
- [ ] Security review done
- [ ] Documentation updated
- [ ] Accessibility tested
- [ ] API responses documented
- [ ] Error messages user-friendly
- [ ] Database migrations tested
- [ ] Backup/restore tested
