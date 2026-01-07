import pino from 'pino';

// Create a logger instance with appropriate configuration
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // In development, use pretty printing for better readability
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

// Create child loggers for different modules
export const authLogger = logger.child({ module: 'auth' }) as any;
export const dbLogger = logger.child({ module: 'database' }) as any;
export const apiLogger = logger.child({ module: 'api' }) as any;
export const emailLogger = logger.child({ module: 'email' }) as any;
export const discordLogger = logger.child({ module: 'discord' }) as any;
export const notificationLogger = logger.child({ module: 'notification' }) as any;
export const jellyfinLogger = logger.child({ module: 'jellyfin' }) as any;
export const setupLogger = logger.child({ module: 'setup' }) as any;
export const usersLogger = logger.child({ module: 'users' }) as any;
export const invitesLogger = logger.child({ module: 'invites' }) as any;
export const adminLogger = logger.child({ module: 'admin' }) as any;
export const testLogger = logger.child({ module: 'test' }) as any;
export const quickConnectLogger = logger.child({ module: 'quickconnect' }) as any;
export const configLogger = logger.child({ module: 'config' }) as any;
export const servicesLogger = logger.child({ module: 'services' }) as any;
export const authSettingsLogger = logger.child({ module: 'auth-settings' }) as any;
export const settingsLogger = logger.child({ module: 'settings' }) as any;
export const pluginLogger = logger.child({ module: 'plugin' }) as any;