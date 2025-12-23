import {
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  cleanupExpiredPasswordResetTokens
} from '../app/lib/db/queries';

describe('Password Reset Tokens', () => {
  test('should create a password reset token', () => {
    const token = createPasswordResetToken('user123', 'admin456', 24);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('should retrieve a valid password reset token', () => {
    const token = createPasswordResetToken('user123', 'admin456', 24);
    const retrievedToken = getPasswordResetToken(token);

    expect(retrievedToken).toBeDefined();
    expect(retrievedToken?.userId).toBe('user123');
    expect(retrievedToken?.createdBy).toBe('admin456');
    expect(retrievedToken?.used).toBe(false);
  });

  test('should return null for invalid token', () => {
    const retrievedToken = getPasswordResetToken('invalid-token');

    expect(retrievedToken).toBeNull();
  });

  test('should mark token as used', () => {
    const token = createPasswordResetToken('user123', 'admin456', 24);

    // Token should be valid initially
    expect(getPasswordResetToken(token)).toBeDefined();

    // Mark as used
    const marked = markPasswordResetTokenUsed(token);
    expect(marked).toBe(true);

    // Token should no longer be retrievable
    expect(getPasswordResetToken(token)).toBeNull();
  });

  test('should return false when marking invalid token as used', () => {
    const marked = markPasswordResetTokenUsed('invalid-token');
    expect(marked).toBe(false);
  });

  test('should cleanup expired tokens', () => {
    // Create a token that expires immediately
    const token = createPasswordResetToken('user123', 'admin456', -1); // Already expired

    // Token should exist initially
    expect(getPasswordResetToken(token)).toBeDefined();

    // Cleanup expired tokens
    const cleanedCount = cleanupExpiredPasswordResetTokens();
    expect(cleanedCount).toBeGreaterThanOrEqual(1);

    // Token should no longer exist
    expect(getPasswordResetToken(token)).toBeNull();
  });
});