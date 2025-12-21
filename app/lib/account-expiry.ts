import { getExpiringUsers, getExpiredUsers, markExpiryWarningSent } from './db/queries';
import { sendExpiryWarningNotification, sendAccountDisabledNotification } from './notifications';
import { getConfig } from './config';
import { JellyfinAuth, buildJellyfinBaseUrl } from './jellyfin';

export class AccountExpiryManager {
  private intervalId: NodeJS.Timeout | null = null;
  private checkInterval: number = 60 * 60 * 1000; // Check every hour

  constructor() {
    this.startExpiryChecks();
  }

  startExpiryChecks() {
    console.log('Starting account expiry monitoring...');

    // Run initial check
    this.checkExpiringAccounts();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkExpiringAccounts();
    }, this.checkInterval);
  }

  stopExpiryChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Stopped account expiry monitoring');
    }
  }

  async checkExpiringAccounts() {
    try {
      console.log('Checking for expiring accounts...');

      // Check for accounts expiring within 7 days
      const expiringUsers = getExpiringUsers(7);

      for (const { user, daysUntilExpiry } of expiringUsers) {
        try {
          await sendExpiryWarningNotification(user.id, user.name || 'User', daysUntilExpiry);
          markExpiryWarningSent(user.id);
          console.log(`Sent expiry warning to user ${user.id} (${daysUntilExpiry} days remaining)`);
        } catch (error) {
          console.error(`Failed to send expiry warning to user ${user.id}:`, error);
        }
      }

      // Check for expired accounts and disable them
      const expiredUsers = getExpiredUsers();

      if (expiredUsers.length > 0) {
        const config = getConfig();
        if (!config.jellyfinUrl || !config.apiKey) {
          console.error('Jellyfin configuration not found. Cannot disable expired users.');
        } else {
          const jellyfinAuth = new JellyfinAuth(buildJellyfinBaseUrl(config.jellyfinUrl), config.apiKey);

          for (const user of expiredUsers) {
            try {
              // Send account disabled notification
              await sendAccountDisabledNotification(user.id, user.name || 'User');

              // Disable the user in Jellyfin
              await jellyfinAuth.disableUser(user.jellyfinId);

              console.log(`Account expired and disabled for user ${user.id} (${user.name})`);
            } catch (error) {
              console.error(`Failed to disable expired account for user ${user.id}:`, error);
            }
          }
        }
      }

      console.log(`Expiry check complete. Found ${expiringUsers.length} expiring accounts and ${expiredUsers.length} expired accounts.`);
    } catch (error) {
      console.error('Error during expiry check:', error);
    }
  }

  // Manual trigger for testing
  async triggerExpiryCheck() {
    console.log('Manually triggering expiry check...');
    await this.checkExpiringAccounts();
  }
}

// Singleton instance
export const accountExpiryManager = new AccountExpiryManager();