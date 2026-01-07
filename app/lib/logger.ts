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
export const authLogger = logger.child({ module: 'auth' });
export const dbLogger = logger.child({ module: 'database' });
export const apiLogger = logger.child({ module: 'api' });
export const emailLogger = logger.child({ module: 'email' });
export const discordLogger = logger.child({ module: 'discord' });
export const notificationLogger = logger.child({ module: 'notification' });
export const jellyfinLogger = logger.child({ module: 'jellyfin' });
export const setupLogger = logger.child({ module: 'setup' });

// Export the main logger as default
export default logger;

// Utility function to create child loggers with request context
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId,
    module: 'request'
  });
}

// Utility function to log API requests
export function logApiRequest(method: string, url: string, statusCode: number, duration: number, userId?: string) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[level]({
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId,
    msg: `API ${method} ${url} - ${statusCode} (${duration}ms)`
  });
}

// Utility function to log database operations
export function logDatabaseOperation(operation: string, table: string, duration: number, success: boolean, error?: string) {
  const level = success ? 'debug' : 'error';

  dbLogger[level]({
    operation,
    table,
    duration: `${duration}ms`,
    success,
    error,
    msg: `DB ${operation} on ${table} - ${success ? 'success' : 'failed'} (${duration}ms)`
  });
}

// Utility function to log authentication events
export function logAuthEvent(event: string, userId?: string, ip?: string, userAgent?: string, success: boolean = true, details?: any) {
  const level = success ? 'info' : 'warn';

  authLogger[level]({
    event,
    userId,
    ip,
    userAgent,
    success,
    details,
    msg: `Auth ${event} - ${success ? 'success' : 'failed'}${userId ? ` for user ${userId}` : ''}`
  });
}

// Utility function to log errors with context
export function logError(error: Error, context?: any, module: string = 'general') {
  const childLogger = logger.child({ module });

  childLogger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    msg: `Error in ${module}: ${error.message}`
  });
}