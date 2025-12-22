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
      console.log('Discord bot not configured for DMs, logging instead:', { username, content });
      return false;
    }

    try {
      // Search for the user by username
      const userId = await this.getUserIdByUsername(username);
      if (!userId) {
        console.error(`Discord user not found: ${username}`);
        return false;
      }

      // Send DM to the user
      return await this.sendDirectMessage(userId, content);
    } catch (error) {
      console.error(`Failed to send Discord DM to ${username}:`, error);
      return false;
    }
  }

  private async getUserIdByUsername(username: string): Promise<string | null> {
    if (!this.config?.botToken) {
      return null;
    }

    try {
      // Note: Discord API doesn't have a direct username search endpoint
      // The bot needs to share a server with the user to find them
      // This is a limitation - in production, you'd need to implement a user registration flow
      // where users link their Discord accounts and you store the Discord User ID
      
      console.warn(`Discord username lookup for "${username}" - Note: Bot must share a server with user`);
      
      // For now, we'll return null and log a warning
      // In a real implementation, you should:
      // 1. Have users link their Discord account during registration
      // 2. Store the Discord User ID in the database
      // 3. Use that ID directly instead of looking up by username
      
      return null;
    } catch (error) {
      console.error('Failed to lookup Discord user:', error);
      return null;
    }
  }

  async sendDirectMessage(userId: string, content: string): Promise<boolean> {
    if (!this.config?.botToken) {
      console.log('Discord bot not configured for DMs, logging instead:', { userId, content });
      return false;
    }

    try {
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
        console.error('Failed to create DM channel:', error);
        return false;
      }

      const dmChannel = await dmResponse.json();

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
        console.log('Discord DM sent successfully to user:', userId);
        return true;
      }

      const error = await messageResponse.text();
      console.error('Failed to send Discord DM:', error);
      return false;
    } catch (error) {
      console.error('Failed to send Discord DM:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.botToken !== '';
  }
}

// Singleton instance
export const discordService = new DiscordService();