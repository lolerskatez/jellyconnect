import { getConfig } from './config';

export interface DiscordConfig {
  webhookUrl: string;
  botToken: string;
  defaultChannelId: string;
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

      if (!dbConfig.discord?.webhookUrl && !dbConfig.discord?.botToken) {
        console.warn('Discord service not configured in database. Set Discord settings in the admin panel.');
        return;
      }

      this.config = {
        webhookUrl: dbConfig.discord.webhookUrl || '',
        botToken: dbConfig.discord.botToken || '',
        defaultChannelId: dbConfig.discord.channelId || '',
      };

      console.log('Discord service initialized successfully from database config');
    } catch (error) {
      console.error('Failed to initialize Discord service:', error);
    }
  }

  async sendMessage(content: string, channelId?: string): Promise<boolean> {
    if (!this.config) {
      console.log('Discord service not configured, logging instead:', { content });
      return false;
    }

    try {
      // Try webhook first (simpler)
      if (this.config.webhookUrl) {
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            username: 'JellyConnect',
          }),
        });

        if (response.ok) {
          console.log('Discord webhook message sent successfully');
          return true;
        }
      }

      // Fallback to bot API if webhook fails and bot token is available
      if (this.config.botToken && channelId) {
        const response = await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${this.config.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
          }),
        });

        if (response.ok) {
          console.log('Discord bot message sent successfully');
          return true;
        }
      }

      console.error('Failed to send Discord message via any method');
      return false;
    } catch (error) {
      console.error('Failed to send Discord message:', error);
      return false;
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
        console.error('Failed to create DM channel');
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
        console.log('Discord DM sent successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to send Discord DM:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.config !== null && (this.config.webhookUrl !== '' || this.config.botToken !== '');
  }
}

// Singleton instance
export const discordService = new DiscordService();