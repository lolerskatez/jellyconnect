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
npm run dev
```

3. Run tests to verify everything is working:

```bash
npm test
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser. You'll be prompted to configure the service.

4. Go to the setup page at [http://localhost:3000/setup](http://localhost:3000/setup) and fill in your configuration:

   - **Jellyfin Server URL**: The URL of your Jellyfin server (e.g., `http://localhost:8096`)
   - **Jellyfin Admin Username**: Your Jellyfin admin username (used only for initial setup)
   - **Jellyfin Admin Password**: Your Jellyfin admin password (used only for initial setup)

   The application will automatically generate an API key for secure communication with Jellyfin and discard the admin credentials.

5. Save the configuration. The app will now be ready to use.

### Notification Configuration (Optional)

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
   - **Redirect URI**: `http://your-jellyconnect-url/api/auth/callback/oidc`
   - **Grant Type**: Authorization Code
   - **Scopes**: `openid`, `email`, `profile`

2. Configure environment variables in `.env.local`:
```env
NEXTAUTH_URL=http://your-jellyconnect-url:3000
NEXT_PUBLIC_NEXTAUTH_URL=http://your-jellyconnect-url:3000
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
# Application Mode Configuration
# Set to 'admin' for admin system or 'public' for user system
APP_MODE=admin

# Port configuration
ADMIN_PORT=3000
PUBLIC_PORT=3001
```

### Running Separate Systems

**Admin System (Port 3000)** - For administrators only:
```bash
npm run dev:admin
# or for production
npm run build:admin && npm run start:admin
```

**Public System (Port 3001)** - For user login/registration:
```bash
npm run dev:public
# or for production
npm run build:public && npm run start:public
```

**Both Systems Simultaneously** (for development):
```bash
npm run dev:both
```

### Security Benefits

- **Port Separation**: Admin and public systems run on different ports
- **Route Isolation**: Middleware prevents cross-access between systems
- **Navigation Control**: Each system shows only relevant navigation options
- **Access Control**: Public users cannot access admin routes, and vice versa

### Production Deployment

For production deployment, you can run both systems simultaneously:

```bash
# Terminal 1 - Admin System
APP_MODE=admin ADMIN_PORT=3000 npm run start

# Terminal 2 - Public System  
APP_MODE=public PUBLIC_PORT=3001 npm run start
```

Make sure your reverse proxy (nginx, Apache, etc.) routes the appropriate domains/paths to the correct ports.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Jellyfin API](https://api.jellyfin.org/)
- [Jellyfin SDK](https://github.com/jellyfin/jellyfin-sdk-typescript)