import { accountExpiryManager } from './app/lib/account-expiry';

// Validate required environment variables on startup
function validateEnvironmentVariables() {
  const requiredVars: Record<string, string> = {
    'NEXTAUTH_SECRET': 'NextAuth secret for session encryption',
    'JELLYFIN_SERVER_URL': 'Jellyfin server URL (e.g., http://localhost:8096)',
  };

  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const [varName, description] of Object.entries(requiredVars)) {
    if (!process.env[varName]) {
      missingVars.push(`  ❌ ${varName}: ${description}`);
    }
  }

  // Check optional but recommended variables
  const optionalVars: Record<string, string> = {
    'NEXT_PUBLIC_APP_MODE': 'Application mode (admin or public)',
    'SMTP_HOST': 'Email service (optional, for email notifications)',
    'DISCORD_BOT_TOKEN': 'Discord service (optional, for Discord notifications)',
  };

  for (const [varName, description] of Object.entries(optionalVars)) {
    if (!process.env[varName] && varName !== 'NEXT_PUBLIC_APP_MODE') {
      warnings.push(`  ⚠️  ${varName}: ${description} (optional)`);
    }
  }

  // Report results
  if (missingVars.length > 0) {
    console.error('\n❌ CONFIGURATION ERROR: Missing required environment variables:');
    console.error(missingVars.join('\n'));
    console.error('\nPlease set these variables in .env.local and restart the server.\n');
    // In production, throw an error. In development, allow startup but warn
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variables');
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  OPTIONAL: Some features may not work without these variables:');
    console.warn(warnings.join('\n'));
    console.warn();
  }

  if (missingVars.length === 0) {
    console.log('✅ Environment validation: All required variables are set');
  }
}

export async function register() {
  // Validate environment variables on server startup
  console.log('Initializing JellyConnect server...');
  validateEnvironmentVariables();

  // Temporarily disabled account expiry monitoring for testing
  // The AccountExpiryManager constructor automatically starts the monitoring
  // We just need to import it to ensure it's initialized
  // console.log('Account expiry monitoring initialized');
}