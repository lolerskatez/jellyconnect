import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

// Static salt for key derivation (stored in env or generated once)
// This ensures the same key is derived each time for the same secret
function getSalt(): Buffer {
  const envSalt = process.env.ENCRYPTION_SALT;
  if (envSalt) {
    return Buffer.from(envSalt, 'base64');
  }
  // Fallback: derive a deterministic salt from the secret itself
  // This is less ideal but works without additional configuration
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || '';
  return crypto.createHash('sha256').update('jellyconnect-salt:' + secret).digest();
}

// Get encryption key using PBKDF2 for proper key derivation
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('No encryption key available. Set ENCRYPTION_KEY or NEXTAUTH_SECRET.');
  }
  
  // Use PBKDF2 for secure key derivation
  const salt = getSalt();
  return crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns a base64-encoded string containing IV + tag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const tag = cipher.getAuthTag();
  
  // Combine IV + tag + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a string that was encrypted with the encrypt function
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract IV, tag, and ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}
