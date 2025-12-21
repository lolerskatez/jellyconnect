import { getConfig } from './config';

export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
}

export class WebhookService {
  private config: WebhookConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    try {
      const dbConfig = getConfig();

      if (!dbConfig.webhook?.url) {
        console.warn('Webhook service not configured in database. Set webhook settings in the admin panel.');
        return;
      }

      this.config = {
        url: dbConfig.webhook.url,
        secret: dbConfig.webhook.secret,
        headers: dbConfig.webhook.headers || {},
      };

      console.log('Webhook service initialized successfully from database config');
    } catch (error) {
      console.error('Failed to initialize webhook service:', error);
    }
  }

  async sendNotification(payload: any): Promise<boolean> {
    if (!this.config) {
      console.log('Webhook service not configured, logging instead:', payload);
      return false;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.headers,
      };

      if (this.config.secret) {
        headers['X-Webhook-Secret'] = this.config.secret;
      }

      const response = await fetch(this.config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('Webhook notification sent successfully');
        return true;
      } else {
        console.error('Webhook request failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.url !== '';
  }
}

export const webhookService = new WebhookService();