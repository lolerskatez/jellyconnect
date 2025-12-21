import { accountExpiryManager } from './app/lib/account-expiry';

export async function register() {
  // Initialize account expiry monitoring on server startup
  console.log('Initializing JellyConnect server...');

  // The AccountExpiryManager constructor automatically starts the monitoring
  // We just need to import it to ensure it's initialized
  console.log('Account expiry monitoring initialized');
}