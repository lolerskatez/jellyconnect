import { getConfig } from './config';
import { discordLogger } from './logger';

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
        discordLogger.warn('Discord bot not configured in database - set Discord bot token in admin panel')
        return;
      }

      this.config = {
        botToken: dbConfig.discord.botToken,
      };

      discordLogger.info('Discord service initialized successfully from database config')
    } catch (error) {
      discordLogger.error('Failed to initialize Discord service', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  async sendDirectMessageByUsername(username: string, content: string): Promise<boolean> {
    if (!this.config?.botToken) {
      discordLogger.info('Discord bot not configured - logging instead', { username, contentLength: content.length })
      return false;
    }

    try {
      discordLogger.info('Attempting to send DM to user', { username })
      
      // Search for the user by username
      const userId = await this.getUserIdByUsername(username);
      if (!userId) {
        discordLogger.warn('Discord user not found', { username })
        return false;
      }

      // Send DM to the user
      return await this.sendDirectMessage(userId, content);
    } catch (error) {
      discordLogger.error('Failed to send Discord DM', { username, error: error instanceof Error ? error.message : 'Unknown error' })
      return false;
    }
  }

  private async getUserIdByUsername(username: string): Promise<string | null> {
    if (!this.config?.botToken) {
      discordLogger.warn('Discord bot token not configured')
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
        const errorText = await guildsResponse.text()
        discordLogger.error('Failed to fetch bot guilds', { status: guildsResponse.status, error: errorText })
        return null;
      }

      const guilds = await guildsResponse.json();
      discordLogger.info('Searching for Discord user across guilds', { username, guildCount: guilds.length })

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
              discordLogger.info('Found Discord user in guild', { username, userId: user.id, guildId: guild.id })
              return user.id;
            }
          } else {
            discordLogger.debug('Members search failed in guild', { guildId: guild.id, status: membersResponse.status })
          }
        } catch (guildError) {
          // Continue to next guild if this one fails
          discordLogger.debug('Failed to search guild', { guildId: guild.id, error: guildError instanceof Error ? guildError.message : 'Unknown error' })
        }
      }

      discordLogger.warn('Discord user not found in any shared servers', { username })
      return null;
    } catch (error) {
      discordLogger.error('Failed to lookup Discord user by username', { username, error: error instanceof Error ? error.message : 'Unknown error' })
      return null;
    }
  }

  async sendDirectMessage(userId: string, content: string): Promise<boolean> {
    if (!this.config?.botToken) {
      discordLogger.info('Discord bot not configured for DMs - logging instead', { userId, contentLength: content.length })
      return false;
    }

    try {
      discordLogger.info('Sending Discord DM to user', { userId })
      
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
        discordLogger.error('Failed to create Discord DM channel', { userId, status: dmResponse.status, error })
        return false;
      }

      const dmChannel = await dmResponse.json();
      discordLogger.info('Created Discord DM channel', { userId, channelId: dmChannel.id })

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
        discordLogger.info('Discord DM sent successfully', { userId })
        return true;
      }

      const error = await messageResponse.text();
      discordLogger.error('Failed to send Discord DM', { userId, status: messageResponse.status, error })
      return false;
    } catch (error) {
      discordLogger.error('Exception sending Discord DM', { userId, error: error instanceof Error ? error.message : 'Unknown error' })
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