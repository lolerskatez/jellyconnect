/**
 * Input Sanitization Utility
 * Provides sanitization functions for common input types
 */

/**
 * Sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>'"]/g, ''); // Remove potentially dangerous characters
}

/**
 * Sanitize usernames/alphanumeric strings
 */
export function sanitizeUsername(username: string): string {
  return username
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, ''); // Only allow alphanumeric, underscore, hyphen
}

/**
 * Sanitize Discord usernames
 */
export function sanitizeDiscordUsername(username: string): string {
  return username
    .trim()
    .replace(/[<>@#&"]/g, ''); // Remove Discord special characters
}

/**
 * Sanitize URLs
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

/**
 * Sanitize plain text (remove scripts, trim whitespace)
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, ''); // Remove all HTML tags
}

/**
 * Sanitize file names
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid characters with underscore
    .substring(0, 255); // Limit length
}

/**
 * Validate and sanitize input object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<keyof T, (value: any) => string>
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const [key, sanitizer] of Object.entries(schema)) {
    if (key in obj && obj[key] !== undefined) {
      try {
        sanitized[key as keyof T] = sanitizer(obj[key]) as any;
      } catch (error) {
        throw new Error(`Failed to sanitize field "${key}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return sanitized;
}
