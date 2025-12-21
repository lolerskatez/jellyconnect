import { randomBytes, randomInt } from 'crypto';

/**
 * Generates a secure, random password for Jellyfin users.
 * The password is meant for security purposes only - users won't use it
 * since they authenticate via SSO. This prevents Jellyfin from being
 * vulnerable to accounts without proper password protection.
 * Uses crypto.randomBytes for cryptographically secure random generation.
 */
export function generateSecurePassword(length: number = 32): string {
  const chars = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  const allChars = chars.lowercase + chars.uppercase + chars.numbers + chars.symbols;
  const passwordChars: string[] = [];

  // Ensure at least one character from each category using crypto
  passwordChars.push(chars.lowercase[randomInt(chars.lowercase.length)]);
  passwordChars.push(chars.uppercase[randomInt(chars.uppercase.length)]);
  passwordChars.push(chars.numbers[randomInt(chars.numbers.length)]);
  passwordChars.push(chars.symbols[randomInt(chars.symbols.length)]);

  // Fill the rest with random characters using crypto
  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(allChars[randomInt(allChars.length)]);
  }

  // Shuffle using Fisher-Yates with crypto random
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}

/**
 * Generates a secure random username if needed
 * Uses crypto.randomBytes for cryptographically secure random suffix.
 */
export function generateSecureUsername(email: string): string {
  // Extract the part before @ and make it safe
  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
  
  // Add random suffix using crypto for uniqueness
  const randomSuffix = randomBytes(4).toString('hex');
  
  return `${baseUsername}_${randomSuffix}`.substring(0, 32); // Jellyfin has a username length limit
}
