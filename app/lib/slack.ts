import { getConfig } from './config';

export interface SlackConfig {
  webhookUrl: string;
  botToken?: string;
  defaultChannel?: string;
}

export class SlackService {
  private config: SlackConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    try {
      const dbConfig = getConfig();

      if (!dbConfig.slack?.webhookUrl && !dbConfig.slack?.botToken) {
        console.warn('Slack service not configured in database. Set Slack settings in the admin panel.');
        return;
      }

      this.config = {
        webhookUrl: dbConfig.slack.webhookUrl || '',
        botToken: dbConfig.slack.botToken || '',
        defaultChannel: dbConfig.slack.channelId || '',
      };

      console.log('Slack service initialized successfully from database config');
    } catch (error) {
      console.error('Failed to initialize Slack service:', error);
    }
  }

  async sendMessage(text: string, channel?: string): Promise<boolean> {
    if (!this.config) {
      console.log('Slack service not configured, logging instead:', { text, channel });
      return false;
    }

    try {
      // Use webhook if available (simpler)
      if (this.config.webhookUrl) {
        const payload = {
          text,
          channel: channel || this.config.defaultChannel,
        };

        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log('Slack webhook message sent successfully');
          return true;
        }
      }

      // Fallback to bot API if webhook fails and bot token is available
      if (this.config.botToken && (channel || this.config.defaultChannel)) {
        const targetChannel = channel || this.config.defaultChannel;
        const response = await fetch(`https://slack.com/api/chat.postMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: targetChannel,
            text,
          }),
        });

        const result = await response.json();
        if (result.ok) {
          console.log('Slack bot message sent successfully');
          return true;
        }
      }

      console.error('Failed to send Slack message via any method');
      return false;
    } catch (error) {
      console.error('Failed to send Slack message:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.config !== null && (this.config.webhookUrl !== '' || this.config.botToken !== '');
  }
}

export const slackService = new SlackService();