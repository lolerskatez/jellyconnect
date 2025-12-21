/**
 * Generates a secure, random password for Jellyfin users.
 * The password is meant for security purposes only - users won't use it
 * since they authenticate via SSO. This prevents Jellyfin from being
 * vulnerable to accounts without proper password protection.
 */
export function generateSecurePassword(length: number = 32): string {
  const chars = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  const allChars = chars.lowercase + chars.uppercase + chars.numbers + chars.symbols;
  let password = '';

  // Ensure at least one character from each category
  password += chars.lowercase[Math.floor(Math.random() * chars.lowercase.length)];
  password += chars.uppercase[Math.floor(Math.random() * chars.uppercase.length)];
  password += chars.numbers[Math.floor(Math.random() * chars.numbers.length)];
  password += chars.symbols[Math.floor(Math.random() * chars.symbols.length)];

  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generates a secure random username if needed
 */
export function generateSecureUsername(email: string): string {
  // Extract the part before @ and make it safe
  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
  
  // Add random suffix to ensure uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${baseUsername}_${randomSuffix}`.substring(0, 32); // Jellyfin has a username length limit
}
