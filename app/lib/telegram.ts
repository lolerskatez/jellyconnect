import { getConfig } from './config';

export interface TelegramConfig {
  botToken: string;
  defaultChatId?: string;
}

export class TelegramService {
  private config: TelegramConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    try {
      const dbConfig = getConfig();

      if (!dbConfig.telegram?.botToken) {
        console.warn('Telegram service not configured in database. Set Telegram settings in the admin panel.');
        return;
      }

      this.config = {
        botToken: dbConfig.telegram.botToken,
        defaultChatId: dbConfig.telegram.chatId || '',
      };

      console.log('Telegram service initialized successfully from database config');
    } catch (error) {
      console.error('Failed to initialize Telegram service:', error);
    }
  }

  async sendMessage(text: string, chatId?: string): Promise<boolean> {
    if (!this.config) {
      console.log('Telegram service not configured, logging instead:', { text, chatId });
      return false;
    }

    try {
      const targetChatId = chatId || this.config.defaultChatId;
      if (!targetChatId) {
        console.error('No chat ID provided for Telegram message');
        return false;
      }

      const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: targetChatId,
          text,
          parse_mode: 'Markdown', // Support for basic formatting
        }),
      });

      const result = await response.json();
      if (result.ok) {
        console.log('Telegram message sent successfully');
        return true;
      } else {
        console.error('Telegram API error:', result.description);
        return false;
      }
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      return false;
    }
  }

  async sendToUser(text: string, userId: string): Promise<boolean> {
    // For Telegram, user ID is typically the chat ID
    return this.sendMessage(text, userId);
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.botToken !== '';
  }
}

export const telegramService = new TelegramService();