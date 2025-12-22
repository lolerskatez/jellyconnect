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
    botToken: string
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
    botToken: process.env.DISCORD_BOT_TOKEN || '',
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
        botToken: parsed.discord?.botToken || defaultConfig.discord!.botToken,
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