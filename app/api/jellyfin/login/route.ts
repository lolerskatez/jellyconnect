import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated in our app
    const url = new URL(request.url)
    let token = url.searchParams.get('token')
    
    // Decode the token in case it's URL encoded
    if (token) {
      token = decodeURIComponent(token)
    }
    
    if (!token) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      }
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const config = getConfig()
    if (!config.jellyfinUrl) {
      return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 500 })
    }

    console.log('[Jellyfin Login] Authenticating user with token:', token.substring(0, 20) + '...')
    console.log('[Jellyfin Login] Full token:', token)
    console.log('[Jellyfin Login] Jellyfin URL:', config.jellyfinUrl)

    // Verify the token is valid with Jellyfin
    const authHeader = `MediaBrowser Client="JellyConnect", Device="Web App", DeviceId="web-app-1", Version="1.0.0", Token="${token}"`
    console.log('[Jellyfin Login] Auth header:', authHeader)
    
    const validateRes = await fetch(`${config.jellyfinUrl}/Users/Me`, {
      headers: {
        'X-Emby-Authorization': authHeader
      }
    })

    if (!validateRes.ok) {
      const errorText = await validateRes.text()
      console.error('[Jellyfin Login] Token validation failed!')
      console.error('[Jellyfin Login] Status:', validateRes.status)
      console.error('[Jellyfin Login] Response:', errorText)
      console.error('[Jellyfin Login] Full token:', token)
      console.error('[Jellyfin Login] Auth header:', authHeader)

      // Token is invalid/expired - return error instead of redirect
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Session Expired</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(to bottom right, #0f172a, #1e293b);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
      background: linear-gradient(to right, #fb923c, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #cbd5e1;
      margin-bottom: 2rem;
    }
    a {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(to right, #f97316, #ea580c);
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Session Expired</h1>
    <p>Your session has expired. Please log in again to access Jellyfin.</p>
    <a href="/login">Back to Login</a>
  </div>
</body>
</html>`,
        {
          status: 401,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          }
        }
      )
    }

    // Get user info to include in server data
    const userRes = await fetch(`${config.jellyfinUrl}/Users/Me`, {
      headers: {
        'X-Emby-Authorization': `MediaBrowser Client="JellyConnect", Device="Web App", DeviceId="web-app-1", Version="1.0.0", Token="${token}"`
      }
    })

    if (!userRes.ok) {
      console.error('[Jellyfin Login] Failed to get user info:', userRes.status)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('message', 'Failed to get user information. Please log in again.')
      return NextResponse.redirect(loginUrl)
    }

    const userData = await userRes.json()
    console.log('[Jellyfin Login] User info retrieved:', userData.Name)

    // IMPORTANT: localStorage is domain-specific! 
    // We can't set localStorage on localhost:3001 and expect Jellyfin at 192.168.1.183:8097 to read it.
    // Solution: Redirect to a special Jellyfin endpoint or embed auth in the redirect URL
    
    const serverId = userData.ServerId
    
    // Create a redirect to Jellyfin with embedded credentials that will set localStorage on Jellyfin's domain
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Logging in to Jellyfin...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(to bottom right, #0f172a, #1e293b);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
      background: linear-gradient(to right, #fb923c, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      border-top: 4px solid #f97316;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 2rem auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    p {
      color: #cbd5e1;
    }
  </style>
  <script>
    (function() {
      const token = ${JSON.stringify(token)};
      const jellyfinUrl = ${JSON.stringify(config.jellyfinUrl)};
      const userId = ${JSON.stringify(userData.Id)};
      const userName = ${JSON.stringify(userData.Name)};
      const serverId = ${JSON.stringify(serverId)};
      
      console.log('[Jellyfin Login Page] Starting login process...');
      console.log('[Jellyfin Login Page] Token:', token);
      console.log('[Jellyfin Login Page] URL:', jellyfinUrl);
      console.log('[Jellyfin Login Page] Server ID:', serverId);
      console.log('[Jellyfin Login Page] User:', userName, '(' + userId + ')');
      
      // Redirect to Jellyfin with credentials in URL hash - Jellyfin will extract and store them
      // This works because the redirect will be on Jellyfin's domain
      const authData = btoa(JSON.stringify({
        token: token,
        userId: userId,
        serverId: serverId,
        serverUrl: jellyfinUrl,
        userName: userName
      }));
      
      // Redirect to Jellyfin with auth data
      // We'll create a custom landing page on Jellyfin's domain that sets localStorage
      const redirectUrl = jellyfinUrl + '/web/index.html#auth=' + encodeURIComponent(authData);
      console.log('[Jellyfin Login Page] Redirecting to Jellyfin with embedded auth');
      
      // Actually, Jellyfin doesn't support that. Let's use a form POST instead
      // Create a hidden form that will POST to Jellyfin and redirect
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = jellyfinUrl + '/web/index.html';
      form.style.display = 'none';
      
      // Open Jellyfin in a way that allows us to set localStorage
      // Since we can't set localStorage cross-domain, we need to redirect to a page
      // on Jellyfin's domain that will do it for us
      
      // Actually, the solution is simpler: redirect to Jellyfin's web client
      // and use window.postMessage or URL fragments
      
      // For now, let's just redirect and let the user manually login
      // OR use Jellyfin's Quick Connect feature instead
      
      console.log('[Jellyfin Login Page] Cross-domain localStorage issue detected');
      console.log('[Jellyfin Login Page] Redirecting to Quick Connect instead');
      
      // Redirect back to JellyConnect Quick Connect page
      window.location.href = '/quickconnect';
    })();
  </script>
</head>
<body>
  <div class="container">
    <h1>Logging in to Jellyfin...</h1>
    <div class="spinner"></div>
    <p>Please wait while we redirect you to Jellyfin.</p>
    <p style="margin-top: 2rem;">If you are not redirected automatically, <a href="${config.jellyfinUrl}/web/index.html" style="color: #f97316; text-decoration: underline;">click here</a>.</p>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    })
  } catch (error) {
    console.error('[Jellyfin Login] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
