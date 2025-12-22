import { getConfig } from './config';

export interface DiscordConfig {
  botToken: string;
}

export class DiscordService {
  private config: DiscordConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    try {
      // Get Discord configuration from database config
      const dbConfig = getConfig();

      if (!dbConfig.discord?.botToken) {
        console.warn('Discord bot not configured in database. Set Discord bot token in the admin panel.');
        return;
      }

      this.config = {
        botToken: dbConfig.discord.botToken,
      };

      console.log('Discord service initialized successfully from database config');
    } catch (error) {
      console.error('Failed to initialize Discord service:', error);
    }
  }

  async sendDirectMessageByUsername(username: string, content: string): Promise<boolean> {
    if (!this.config?.botToken) {
      console.log('[Discord] Bot not configured, logging instead:', { username, content });
      return false;
    }

    try {
      console.log(`[Discord] Attempting to send DM to user: ${username}`);
      
      // Search for the user by username
      const userId = await this.getUserIdByUsername(username);
      if (!userId) {
        console.warn(`[Discord] User not found: ${username}`);
        return false;
      }

      // Send DM to the user
      return await this.sendDirectMessage(userId, content);
    } catch (error) {
      console.error(`[Discord] Failed to send Discord DM to ${username}:`, error);
      return false;
    }
  }

  private async getUserIdByUsername(username: string): Promise<string | null> {
    if (!this.config?.botToken) {
      console.warn('Discord bot token not configured');
      return null;
    }

    try {
      // Fetch all guilds the bot is in
      const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          'Authorization': `Bot ${this.config.botToken}`,
        },
      });

      if (!guildsResponse.ok) {
        console.error('Failed to fetch bot guilds:', guildsResponse.status, await guildsResponse.text());
        return null;
      }

      const guilds = await guildsResponse.json();
      console.log(`[Discord] Bot is in ${guilds.length} guilds, searching for user: ${username}`);

      // Search for the user in each guild
      for (const guild of guilds) {
        try {
          // Search guild members for username
          const membersResponse = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/members/search?query=${encodeURIComponent(username)}&limit=1`, {
            headers: {
              'Authorization': `Bot ${this.config.botToken}`,
            },
          });

          if (membersResponse.ok) {
            const members = await membersResponse.json();
            if (members.length > 0) {
              const user = members[0].user;
              console.log(`[Discord] Found user ${username} (ID: ${user.id}) in guild ${guild.id}`);
              return user.id;
            }
          } else {
            console.debug(`[Discord] Members search failed in guild ${guild.id}:`, membersResponse.status);
          }
        } catch (guildError) {
          // Continue to next guild if this one fails
          console.debug(`[Discord] Failed to search guild ${guild.id}:`, guildError);
        }
      }

      console.warn(`[Discord] User "${username}" not found in any of the bot's shared servers`);
      return null;
    } catch (error) {
      console.error('[Discord] Failed to lookup user by username:', error);
      return null;
    }
  }

  async sendDirectMessage(userId: string, content: string): Promise<boolean> {
    if (!this.config?.botToken) {
      console.log('[Discord] Bot not configured for DMs, logging instead:', { userId, content });
      return false;
    }

    try {
      console.log(`[Discord] Sending DM to user ID: ${userId}`);
      
      // First create a DM channel
      const dmResponse = await fetch('https://discord.com/api/users/@me/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${this.config.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: userId,
        }),
      });

      if (!dmResponse.ok) {
        const error = await dmResponse.text();
        console.error(`[Discord] Failed to create DM channel for ${userId}:`, dmResponse.status, error);
        return false;
      }

      const dmChannel = await dmResponse.json();
      console.log(`[Discord] Created DM channel: ${dmChannel.id}`);

      // Then send the message
      const messageResponse = await fetch(`https://discord.com/api/channels/${dmChannel.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${this.config.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (messageResponse.ok) {
        console.log(`[Discord] DM sent successfully to user: ${userId}`);
        return true;
      }

      const error = await messageResponse.text();
      console.error(`[Discord] Failed to send Discord DM to ${userId}:`, messageResponse.status, error);
      return false;
    } catch (error) {
      console.error(`[Discord] Exception sending DM to ${userId}:`, error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.botToken !== '';
  }

  // Reinitialize the service (useful when config changes)
  reinitialize(): void {
    this.config = null;
    this.initializeConfig();
  }
}

// Singleton instance
export const discordService = new DiscordService();