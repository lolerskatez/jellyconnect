import nodemailer from 'nodemailer';
import { getConfig } from './config';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Get email configuration from database config
      const dbConfig = getConfig();

      if (!dbConfig.smtp?.host || !dbConfig.smtp?.user || !dbConfig.smtp?.pass) {
        console.warn('Email service not configured in database. Set SMTP settings in the admin panel.');
        return;
      }

      this.config = {
        host: dbConfig.smtp.host,
        port: dbConfig.smtp.port,
        secure: dbConfig.smtp.secure,
        auth: {
          user: dbConfig.smtp.user,
          pass: dbConfig.smtp.pass
        },
        from: dbConfig.smtp.from || dbConfig.smtp.user
      };

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
      });

      console.log('Email service initialized successfully from database config');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.log('Email service not configured, logging instead:', { to, subject });
      return false;
    }

    try {
      const mailOptions = {
        from: this.config.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  // Reinitialize the service (useful when config changes)
  reinitialize(): void {
    this.transporter = null;
    this.config = null;
    this.initializeTransporter();
  }
}

// Singleton instance
export const emailService = new EmailService();