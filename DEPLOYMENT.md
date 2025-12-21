# Deployment Guide

This guide covers deploying JellyConnect in production with SSO authentication, separate admin and public systems, and proper security configuration.

## Prerequisites

- Node.js 18+ and npm
- A running Jellyfin server (v10.8+)
- An OIDC provider (Authentik, Keycloak, Azure AD, etc.)
- SMTP server for email notifications (optional)
- Discord bot/webhook for Discord notifications (optional)

## Architecture

JellyConnect supports two deployment models:

### Single Server (Recommended for small deployments)
- One Next.js instance handles both admin and public routes
- Lower resource usage
- Simpler deployment

### Separate Systems (Recommended for larger deployments)
- Admin system (port 3000) - Admins only
- Public system (port 3001) - User registration/login
- Better security isolation
- Easier horizontal scaling

## Pre-Deployment Configuration

### 1. Jellyfin Setup

1. Go to your Jellyfin server (`http://jellyfin-server:8096`)
2. Create an admin API key:
   - Dashboard → API Keys → Create new API key
   - Name it "JellyConnect"
   - Copy the key
3. Note your Jellyfin server URL: `http://jellyfin-server:8096`

### 2. OIDC Provider Setup

Configure your OIDC provider (e.g., Authentik):

**Create an OAuth2/OIDC Application:**
- Application name: `JellyConnect`
- Redirect URIs:
  - Admin: `https://admin.yourdomain.com/api/auth/callback/oidc`
  - Public: `https://public.yourdomain.com/api/auth/callback/oidc`
  - (Or both if using single domain with path routing)
- Grant types: Authorization Code
- Scopes: `openid`, `profile`, `email`
- Save and note the Client ID and Client Secret

### 3. Domain Configuration

Decide on your domain structure:

**Option A: Subdomain Routing** (Recommended)
```
admin.yourdomain.com → Admin system (port 3000)
public.yourdomain.com → Public system (port 3001)
```

**Option B: Path Routing**
```
yourdomain.com/admin → Admin system (port 3000)
yourdomain.com/public → Public system (port 3001)
```

**Option C: Single System**
```
yourdomain.com → Combined system (both admin and public)
```

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/jellyconnect.git
cd jellyconnect
npm install
```

### 2. Environment Configuration

Create `.env.local` in the root directory:

```env
# Jellyfin Configuration
JELLYFIN_SERVER_URL=https://jellyfin.yourdomain.com
JELLYFIN_ADMIN_USERNAME=admin
JELLYFIN_ADMIN_PASSWORD=admin-password

# OIDC/SSO Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-random-secret-here

# OIDC Provider
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_ISSUER=https://auth-provider.com/application/o/yourapp

# Email Notifications (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Discord Notifications (Optional)
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CHANNEL_ID=your-channel-id

# Application Configuration
APP_MODE=admin
ADMIN_PORT=3000
PUBLIC_PORT=3001
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create Database Directory

JellyConnect uses in-memory JSON storage by default. For persistence:

```bash
mkdir -p data
# The database will be created at ./jellyconnect-data.json
```

## Deployment Options

### Option 1: Docker (Recommended)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000 3001

CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  jellyconnect-admin:
    build: .
    environment:
      - NEXT_PUBLIC_APP_MODE=admin
      - APP_MODE=admin
      - ADMIN_PORT=3000
      - NEXTAUTH_URL=https://admin.yourdomain.com
      - NEXT_PUBLIC_NEXTAUTH_URL=https://admin.yourdomain.com
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  jellyconnect-public:
    build: .
    environment:
      - NEXT_PUBLIC_APP_MODE=public
      - APP_MODE=public
      - PUBLIC_PORT=3001
      - NEXTAUTH_URL=https://public.yourdomain.com
      - NEXT_PUBLIC_NEXTAUTH_URL=https://public.yourdomain.com
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Deploy:
```bash
docker-compose up -d
```

### Option 2: Systemd Service (Linux)

Create `/etc/systemd/system/jellyconnect-admin.service`:

```ini
[Unit]
Description=JellyConnect Admin System
After=network.target

[Service]
Type=simple
User=jellyconnect
WorkingDirectory=/opt/jellyconnect
Environment="NODE_ENV=production"
Environment="NEXT_PUBLIC_APP_MODE=admin"
Environment="APP_MODE=admin"
Environment="ADMIN_PORT=3000"
ExecStart=/usr/local/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable jellyconnect-admin
sudo systemctl start jellyconnect-admin
```

### Option 3: PM2 (Node.js Process Manager)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'jellyconnect-admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_MODE: 'admin',
        APP_MODE: 'admin',
        ADMIN_PORT: 3000,
      },
      instances: 2,
      exec_mode: 'cluster',
    },
    {
      name: 'jellyconnect-public',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_MODE: 'public',
        APP_MODE: 'public',
        PUBLIC_PORT: 3001,
      },
      instances: 2,
      exec_mode: 'cluster',
    },
  ],
};
```

Start services:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Reverse Proxy Configuration

### Nginx (Recommended)

```nginx
# Admin System
server {
    server_name admin.yourdomain.com;
    listen 80;
    listen [::]:80;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    server_name admin.yourdomain.com;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/admin.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Public System
server {
    server_name public.yourdomain.com;
    listen 80;
    listen [::]:80;
    
    return 301 https://$server_name$request_uri;
}

server {
    server_name public.yourdomain.com;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/public.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/public.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Apache

```apache
<VirtualHost *:80>
    ServerName admin.yourdomain.com
    Redirect permanent / https://admin.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName admin.yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/admin.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/admin.yourdomain.com/privkey.pem
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    RequestHeader set X-Forwarded-Proto "https"
</VirtualHost>
```

## SSL/TLS Setup

Using Let's Encrypt with Certbot:

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates
sudo certbot certonly --nginx -d admin.yourdomain.com -d public.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Post-Deployment Configuration

### 1. First-Time Setup

1. Navigate to `https://admin.yourdomain.com`
2. Go to `/setup` to complete initial configuration
3. Enter your Jellyfin server details
4. Configure OIDC provider (admin panel → Settings)
5. Test OIDC flow with "Sign in with SSO"

### 2. Configure OIDC Provider in JellyConnect

After deployment, go to **Admin Settings → Authentication**:
- Enable OIDC
- Enter provider details:
  - Provider Name: "Authentik" (or your provider)
  - Client ID: (from your OIDC provider)
  - Client Secret: (from your OIDC provider)
  - Issuer URL: (your provider's issuer)
- Click "Test Provider" to verify

### 3. Test the Flow

**Admin System Test:**
1. Visit `https://admin.yourdomain.com/login`
2. Click "Sign in with SSO"
3. Should redirect to your OIDC provider
4. After login, should redirect back and be logged in

**Public System Test:**
1. Visit `https://public.yourdomain.com`
2. Create an invite (from admin)
3. Register with invite code
4. Try SSO login

### 4. Monitoring

Check logs:
```bash
# Docker
docker-compose logs -f jellyconnect-admin

# Systemd
journalctl -u jellyconnect-admin -f

# PM2
pm2 logs jellyconnect-admin
```

## Troubleshooting

### Users stuck on loading page after OIDC callback

Check browser DevTools (F12):
1. **Network tab**: Verify `/api/auth/session` returns 200 with user data
2. **Console**: Look for JavaScript errors
3. **Cookies**: Verify `next-auth.session-token` cookie exists

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed debugging steps.

### OIDC Redirect URI mismatch

Verify in your OIDC provider:
- Registered URI should match exactly: `https://yourdomain.com/api/auth/callback/oidc`
- Check domain and protocol (http vs https)
- Check for trailing slashes

### SSL certificate issues

```bash
# Test certificate validity
openssl s_client -connect admin.yourdomain.com:443

# Renew certificate
sudo certbot renew --dry-run
sudo certbot renew
```

## Backup and Recovery

### Backup Database

```bash
# Copy database file
cp jellyconnect-data.json jellyconnect-data.backup.json

# Or with docker
docker cp jellyconnect-admin:/app/jellyconnect-data.json ./backup/
```

### Restore Database

```bash
cp jellyconnect-data.backup.json jellyconnect-data.json
# Restart services
systemctl restart jellyconnect-admin
```

## Scaling Considerations

### Horizontal Scaling

For multiple instances:

1. **Use external database** instead of JSON file (MongoDB, PostgreSQL)
2. **Use Redis** for session storage
3. **Load balance** across multiple instances
4. **Use Docker/Kubernetes** for orchestration

### Performance Tuning

- Enable gzip compression in reverse proxy
- Set appropriate Node.js max old space size: `NODE_OPTIONS=--max-old-space-size=2048`
- Consider using PM2 cluster mode (built-in load balancing)
- Monitor memory and CPU usage

## Security Best Practices

- [ ] Use HTTPS everywhere (Let's Encrypt)
- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Rotate OIDC client secrets regularly
- [ ] Use environment variables for secrets (never commit to git)
- [ ] Enable CORS only for trusted domains
- [ ] Set appropriate password policies
- [ ] Regularly update Node.js and dependencies
- [ ] Monitor logs for suspicious activity
- [ ] Use firewall to restrict access
- [ ] Enable rate limiting on login endpoints

## Maintenance

### Regular Tasks

- Monitor disk space for database growth
- Check for failed authentication attempts
- Review and archive logs
- Update dependencies: `npm update`
- Test backup/restore procedures monthly

### Updates

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update to latest major versions
npm install -g npm-check-updates
ncu -u
npm install

# Rebuild
npm run build

# Restart services
systemctl restart jellyconnect-admin jellyconnect-public
```

## Support

For issues:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review server logs
3. Check [README.md](README.md) for API documentation
4. Open an issue on GitHub with:
   - Error message and logs
   - Environment details (OS, Node version)
   - Steps to reproduce
   - Configuration (with secrets redacted)
