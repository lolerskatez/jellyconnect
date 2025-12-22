import fs from 'fs'
import path from 'path'

interface Config {
  jellyfinUrl: string
  apiKey: string
  oidcClientId?: string
  oidcClientSecret?: string
  oidcIssuer?: string
  nextAuthSecret?: string
  enableRegistration?: boolean
  smtp?: {
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
    from: string
  }
  discord?: {
    webhookUrl: string
    botToken: string
    channelId: string
  }
  slack?: {
    webhookUrl: string
    botToken: string
    channelId: string
  }
  telegram?: {
    botToken: string
    chatId: string
  }
  webhook?: {
    url: string
    secret: string
    headers?: Record<string, string>
  }
}

const configPath = path.join(process.cwd(), 'config.json')

const defaultConfig: Config = {
  jellyfinUrl: process.env.JELLYFIN_SERVER_URL || '',
  apiKey: process.env.JELLYFIN_API_KEY || '',
  oidcClientId: process.env.OIDC_CLIENT_ID || '',
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET || '',
  oidcIssuer: process.env.OIDC_ISSUER || '',
  nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
  enableRegistration: true,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    channelId: process.env.DISCORD_CHANNEL_ID || '',
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    botToken: process.env.SLACK_BOT_TOKEN || '',
    channelId: process.env.SLACK_CHANNEL_ID || '',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
  webhook: {
    url: process.env.WEBHOOK_URL || '',
    secret: process.env.WEBHOOK_SECRET || '',
    headers: {},
  },
}

export function getConfig(): Config {
  try {
    const data = fs.readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(data)
    // Return the parsed config with defaults
    return {
      jellyfinUrl: parsed.jellyfinUrl || '',
      apiKey: parsed.apiKey || '',
      oidcClientId: parsed.oidcClientId || '',
      oidcClientSecret: parsed.oidcClientSecret || '',
      oidcIssuer: parsed.oidcIssuer || '',
      nextAuthSecret: parsed.nextAuthSecret || '',
      enableRegistration: parsed.enableRegistration ?? true,
      smtp: {
        host: parsed.smtp?.host || defaultConfig.smtp!.host,
        port: parsed.smtp?.port || defaultConfig.smtp!.port,
        secure: parsed.smtp?.secure ?? defaultConfig.smtp!.secure,
        user: parsed.smtp?.user || defaultConfig.smtp!.user,
        pass: parsed.smtp?.pass || defaultConfig.smtp!.pass,
        from: parsed.smtp?.from || defaultConfig.smtp!.from,
      },
      discord: {
        webhookUrl: parsed.discord?.webhookUrl || defaultConfig.discord!.webhookUrl,
        botToken: parsed.discord?.botToken || defaultConfig.discord!.botToken,
        channelId: parsed.discord?.channelId || defaultConfig.discord!.channelId,
      },
      slack: {
        webhookUrl: parsed.slack?.webhookUrl || defaultConfig.slack!.webhookUrl,
        botToken: parsed.slack?.botToken || defaultConfig.slack!.botToken,
        channelId: parsed.slack?.channelId || defaultConfig.slack!.channelId,
      },
      telegram: {
        botToken: parsed.telegram?.botToken || defaultConfig.telegram!.botToken,
        chatId: parsed.telegram?.chatId || defaultConfig.telegram!.chatId,
      },
      webhook: {
        url: parsed.webhook?.url || defaultConfig.webhook!.url,
        secret: parsed.webhook?.secret || defaultConfig.webhook!.secret,
        headers: parsed.webhook?.headers || defaultConfig.webhook!.headers,
      },
    }
  } catch (error) {
    return defaultConfig
  }
}

export function saveConfig(config: Partial<Config>): void {
  const current = getConfig()
  const updated = { ...current, ...config }
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2))
}