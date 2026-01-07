# JellyConnect

A comprehensive Next.js application for Jellyfin user management with authentication, invite system, notifications, and account expiry management.

## Features

- **Jellyfin Authentication**: Direct authentication using Jellyfin server credentials
- **SSO/OIDC Authentication**: Single Sign-On support with any OIDC provider (Authentik, Keycloak, Okta, etc.)
- **Role-Based Access Control**: Granular permissions system with Admin, Moderator, and User roles
- **User Management**: Create, view, update, and delete Jellyfin users with role-based access
- **Invite System**: Generate and manage user invites with customizable profiles and usage limits
- **Self-Service Registration**: Public registration portal for users with invite codes
- **Contact Management**: Store and manage user email addresses and Discord usernames
- **Multi-Channel Notifications**:
  - In-app notifications with unread indicators
  - Email notifications for user events
  - Discord notifications via webhooks or bot
  - Per-user notification preferences
- **Account Expiry Management**: Automatic monitoring and notifications for expiring accounts
- **Notification Management**: Admin dashboard for bulk notifications and user preference management
- **System Settings**: Web-based configuration for SMTP and Discord services
- **Quick Connect**: Initiate and authorize Quick Connect sessions for easy login
- **Easy Setup**: Configure the service through a web-based setup page
- **Error Handling**: Built-in error boundaries for graceful error recovery
- **Testing Framework**: Jest-based unit tests for core functionality

## Getting Started

### Prerequisites

- Node.js 18+
- A Jellyfin server

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
# Admin portal only (port 3010)
npm run dev:admin

# Public portal only (port 3020)
npm run dev:public

# Both portals simultaneously
node run-both.js
```

3. Run tests to verify everything is working:

```bash
npm test
```

4. Open [http://localhost:3010](http://localhost:3010) for the admin portal or [http://localhost:3020](http://localhost:3020) for the public portal in your browser.

5. Go to the setup page at admin portal [http://localhost:3010/setup](http://localhost:3010/setup) and fill in your configuration:

   - **Jellyfin Server URL**: The URL of your Jellyfin server (e.g., `http://localhost:8096`)
   - **Jellyfin Admin Username**: Your Jellyfin admin username (used only for initial setup)
   - **Jellyfin Admin Password**: Your Jellyfin admin password (used only for initial setup)

   **Optional Services** (can be configured later in Settings):
   - **Email Notifications**: SMTP server details for sending emails
   - **Discord Notifications**: Bot token for Discord notifications
   - **SSO/OIDC Authentication**: OpenID Connect provider configuration for single sign-on

   The application will automatically generate an API key for secure communication with Jellyfin and discard the admin credentials.

5. Save the configuration. The app will now be ready to use.

## Deployment

For production deployment, see the **[Deployment Guide](DEPLOYMENT.md)** for detailed instructions.

### Architecture

JellyConnect supports running separate **Admin** and **Public** portals on different ports:

- **Admin Portal (Port 3010)**: `jellyconnect.tanjiro.one` - For administrators only
  - Full system access
  - User management, invites, settings
  - Requires Jellyfin administrator account

- **Public Portal (Port 3020)**: `c.tanjiro.one` - For user login/registration
  - Limited user interface
  - Self-service registration with invite codes
  - Account management and personal dashboard

### App Mode Detection

The application automatically detects which portal is running using a multi-layered approach:

1. **Environment Variable** (preferred): `NEXT_PUBLIC_APP_MODE=admin` or `NEXT_PUBLIC_APP_MODE=public`
2. **Port Detection**: Port 3020 = public, Port 3010 = admin
3. **Hostname Detection** (reverse proxy): Hostnames starting with `c.` = public, others = admin

This ensures the app works correctly in all deployment scenarios:
- Local development with explicit ports
- Docker with environment variables
- Reverse proxy with hostname routing

### Quick Docker Deployment

1. Ensure you have Docker and Docker Compose installed.

2. Clone the repository and navigate to the project directory:

```bash
git clone https://github.com/lolerskatez/jellyconnect.git
cd jellyconnect
```

3. Configure your environment variables in `docker-compose.yml`:
   - Update `NEXTAUTH_URL` to your admin domain (admin service)
   - Update `NEXTAUTH_URL` to your public domain (public service)
   - Replace `NEXTAUTH_SECRET` with a secure random string
   - Update `JELLYFIN_SERVER_URL` to your Jellyfin server location

4. Build and run the containers:

```bash
docker-compose up -d
```

5. Access the admin interface at `https://jellyconnect.tanjiro.one` (or your configured admin domain)
6. Access the public interface at `https://c.tanjiro.one` (or your configured public domain)

Complete the setup at the admin portal.

## Documentation

- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment with Docker, systemd, or PM2; reverse proxy setup; SSL/TLS configuration
- **[Testing Guide](TESTING.md)** - Unit tests, manual testing checklists, API testing, performance and security testing
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues with SSO, cookies, session persistence, and debugging steps

## Configuration

JellyConnect supports multi-channel notifications for user events. To enable notifications:

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Configure email settings (SMTP):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@jellyconnect.com
```

3. Configure Discord notifications (choose one method):

**Option A: Webhook (recommended for channels)**
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

**Option B: Bot Token (for DMs and advanced features)**
```env
DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN
DISCORD_CHANNEL_ID=YOUR_CHANNEL_ID
```

4. Restart the application to apply the configuration.

### SSO/OIDC Configuration (Optional)

JellyConnect supports Single Sign-On (SSO) with any OpenID Connect (OIDC) provider such as Authentik, Keycloak, Okta, or Azure AD.

1. Set up your OIDC provider and create a client application with:
   - **Redirect URI (Admin)**: `https://jellyconnect.tanjiro.one/api/auth/callback/oidc`
   - **Redirect URI (Public)**: `https://c.tanjiro.one/api/auth/callback/oidc`
   - **Grant Type**: Authorization Code
   - **Scopes**: `openid`, `email`, `profile`

2. Configure environment variables in `.env.local` for each portal:
   ```env
   # Admin portal
   NEXTAUTH_URL=https://jellyconnect.tanjiro.one
   NEXT_PUBLIC_APP_MODE=admin
   
   # Public portal
   NEXTAUTH_URL=https://c.tanjiro.one
   NEXT_PUBLIC_APP_MODE=public
   
   # Both
   NEXTAUTH_SECRET=your-random-secret-here
   ```

3. Configure the OIDC provider in JellyConnect:
   - Go to **Settings** → **Authentication** in the admin panel
   - Enable OIDC authentication
   - Enter your provider details:
     - **Provider Name**: Display name (e.g., "Authentik", "Keycloak")
     - **Client ID**: From your OIDC provider
     - **Client Secret**: From your OIDC provider
     - **Issuer URL**: Your provider's issuer URL (e.g., `https://auth.example.com/application/o/myapp`)
   - Save the configuration

4. Users can now click "Sign in with SSO" on the login page to authenticate via your OIDC provider.

**Note**: When a user logs in via SSO for the first time, JellyConnect automatically creates a corresponding Jellyfin user account.

### Testing Notifications

To test if your email and Discord configuration is working:

```bash
curl http://localhost:3000/api/services/test
```

This will attempt to send test messages using your configured services and return the results.

### Alternative: Manual Configuration

If you prefer to configure manually, create a `config.json` file in the root directory with the following structure:

```json
{
  "jellyfinUrl": "http://your-jellyfin-server:8096",
  "apiKey": "your-jellyfin-api-key"
}
```

**Note**: The `apiKey` should be obtained from your Jellyfin server's API keys section. The setup page will automatically generate this for you.

## Usage

1. If not configured, the home page will prompt you to go to the setup page.
2. After configuration, administrators can log in using their Jellyfin credentials at `/login`.
3. Navigate to `/users` to manage Jellyfin users (admin access required).
4. Go to `/invites` to create and manage user invites (admin access required).
5. Users can register using invite codes at `/register`.
6. Go to `/quickconnect` to initiate a Quick Connect session.
7. Visit `/notifications` to view and manage in-app notifications.
8. Access `/settings` to configure system-wide SMTP and Discord settings.
9. You can reconfigure at any time by visiting `/setup`.

Open [http://localhost:3000](http://localhost:3000) with your browser to get started.

## Role-Based Access Control

JellyConnect implements a granular permissions system with three user roles:

### Admin
- Full access to all features
- Can manage users, invites, notifications, and system settings
- Can view reports and analytics

### Moderator  
- Can manage invites and notifications
- Cannot manage users or access system settings
- Can view reports

### User
- Basic access only
- Cannot manage any resources
- Limited to personal settings

Users are assigned roles based on their Jellyfin administrator status (Admins get Admin role, others get User role).

## Testing

Run the test suite to verify functionality:

```bash
npm test
```

This will execute Jest-based unit tests for core components including notification services and error boundaries.

## API Routes

### Authentication
- `POST /api/auth/login` - Admin login with Jellyfin credentials
- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/session` - Get current session from cookie
- `POST /api/auth/logout` - Logout and clear session cookie
- `GET /api/auth/providers` - List available authentication providers
- `GET /api/auth/provider-details` - Get OIDC provider configuration details
- `GET /api/auth/callback/oidc` - OIDC callback handler (handles authorization code exchange)

### Users
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)
- `GET /api/users/[id]` - Get user details (admin only)
- `PUT /api/users/[id]` - Update user (admin only)
- `DELETE /api/users/[id]` - Delete user (admin only)
- `GET /api/users/[id]/contacts` - Get user contact information (admin only)
- `PUT /api/users/[id]/contacts` - Update user contact information (admin only)
- `GET /api/users/[id]/notifications` - Get user notification settings (admin only)
- `PUT /api/users/[id]/notifications` - Update user notification settings (admin only)
- `GET /api/users/[id]/expiry` - Get user expiry information (admin only)
- `PUT /api/users/[id]/expiry` - Update user expiry date (admin only)

### Invites
- `GET /api/invites` - List invites (admin only)
- `POST /api/invites` - Create invite (admin only)
- `GET /api/invites/validate` - Validate invite code (public)

### Notifications
- `POST /api/notifications/test` - Send test notification to user (admin only)

### Admin
- `GET /api/admin/expiring-users` - Get list of users with expiring accounts (admin only)
- `POST /api/admin/trigger-expiry-check` - Manually trigger expiry check (admin only)

### Settings
- `GET /api/settings` - Get current system settings (admin only)
- `PUT /api/settings` - Update system settings (admin only)

### Pages
- `/notifications` - Admin dashboard for managing user notifications and sending bulk messages
- `/settings` - System settings configuration for SMTP and Discord services
- `/expiry` - View and manage account expiry information

### Quick Connect
- `POST /api/quickconnect/initiate` - Initiate Quick Connect
- `POST /api/quickconnect/poll` - Poll for authorization

### Configuration
- `GET /api/config/status` - Get configuration status
- `POST /api/setup` - Initial setup configuration

### Jellyfin Integration
- `POST /api/jellyfin/login` - Jellyfin user authentication
- `GET /api/jellyfin/users` - Get Jellyfin users
- `POST /api/jellyfin/validate` - Validate Jellyfin server connection

### Services
- `POST /api/services/test` - Test configured notification services

## Account Expiry Management

JellyConnect includes automatic account expiry monitoring:

- **Automatic Checks**: Runs every hour to identify expiring accounts
- **Warning Notifications**: Sends notifications 7 days before expiry (configurable)
- **Admin Dashboard**: View expiring users at `/expiry`
- **Manual Triggers**: Force expiry checks via `/api/admin/trigger-expiry-check`
- **User Management**: Set expiry dates per user in their detail page

## Notification System

### Channels
- **In-App**: Real-time notifications with unread indicators
- **Email**: SMTP-based email notifications
- **Discord**: Webhook or bot-based Discord messages

### Events
- Welcome messages for new users
- Account expiry warnings
- Account disabled notifications
- Invite usage notifications
- Custom admin notifications

### User Preferences
Each user can configure their notification preferences:
- Enable/disable email notifications
- Enable/disable Discord notifications
- Enable/disable expiry warnings
- Test notification delivery

## Deployment

JellyConnect supports running separate admin and public systems on different ports for enhanced security. This prevents public users from accessing admin functionality.

### Environment Configuration

Create or update your `.env.local` file with the following variables:

```env
# Admin Portal
ADMIN_PORT=3010
NEXTAUTH_URL=https://jellyconnect.tanjiro.one
NEXT_PUBLIC_APP_MODE=admin

# Public Portal
PUBLIC_PORT=3020
NEXTAUTH_URL=https://c.tanjiro.one  # Use different NEXTAUTH_URL for public portal
NEXT_PUBLIC_APP_MODE=public

# Shared Settings
NEXTAUTH_SECRET=your-random-secret-here
JELLYFIN_SERVER_URL=http://localhost:8096
```

### Running Separate Systems

**Admin System (Port 3010)** - For administrators only:
```bash
npm run dev:admin
```

**Public System (Port 3020)** - For user login/registration:
```bash
npm run dev:public
```

**Both Systems Simultaneously** (for development):
```bash
node run-both.js
```

### Production Deployment

For production, use the environment variables to control which portal is running:

```bash
# Terminal 1 - Admin System (Port 3010)
NEXT_PUBLIC_APP_MODE=admin ADMIN_PORT=3010 NEXTAUTH_URL=https://jellyconnect.tanjiro.one npm run start

# Terminal 2 - Public System (Port 3020)
NEXT_PUBLIC_APP_MODE=public PUBLIC_PORT=3020 NEXTAUTH_URL=https://c.tanjiro.one npm run start
```

Or use Docker Compose (see Quick Docker Deployment section above).

### Reverse Proxy Configuration

When running behind a reverse proxy, ensure your reverse proxy forwards the correct hostname headers. The app will automatically detect admin vs public mode based on the hostname:

- Hostnames starting with `c.` route to public portal
- All other hostnames route to admin portal

Example nginx configuration:
```nginx
# Admin Portal
server {
    server_name jellyconnect.tanjiro.one;
    listen 443 ssl http2;
    
    location / {
        proxy_pass http://localhost:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Public Portal  
server {
    server_name c.tanjiro.one;
    listen 443 ssl http2;
    
    location / {
        proxy_pass http://localhost:3020;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Jellyfin API](https://api.jellyfin.org/)
- [Jellyfin SDK](https://github.com/jellyfin/jellyfin-sdk-typescript)