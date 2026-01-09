import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Invalid email format').max(254, 'Email too long');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long');
const usernameSchema = z.string().min(1, 'Username is required').max(50, 'Username too long').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');
const displayNameSchema = z.string().min(1, 'Display name is required').max(100, 'Display name too long');
const inviteCodeSchema = z.string().length(8, 'Invalid invite code format').regex(/^[A-Z0-9]+$/, 'Invalid invite code format');

// User role validation
const userRoleSchema = z.enum(['admin', 'moderator', 'user']);

// Login validation
export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
});

// User creation validation
export const createUserSchema = z.object({
  name: usernameSchema,
  password: passwordSchema,
  email: emailSchema.optional(),
  discordUsername: z.string().max(100, 'Discord username too long').optional(),
  displayName: displayNameSchema.optional(),
  inviteId: z.string().uuid('Invalid invite ID format').optional()
});

// Invite creation validation
export const createInviteSchema = z.object({
  profile: userRoleSchema,
  maxUses: z.number().int().min(1, 'Max uses must be at least 1').max(1000, 'Max uses too high').optional(),
  expiresAt: z.string().datetime('Invalid expiration date format').optional(),
  createdBy: z.string().uuid('Invalid creator ID format'),
  email: emailSchema.optional()
});

// Settings validation
const smtpSchema = z.object({
  host: z.string().max(253, 'SMTP host too long'),
  port: z.number().int().min(1, 'Port must be positive').max(65535, 'Invalid port number'),
  secure: z.boolean(),
  user: z.string().max(254, 'SMTP user too long'),
  pass: z.string().max(128, 'SMTP password too long'),
  from: z.string().max(254, 'From email too long').or(z.literal(''))
});

const discordSchema = z.object({
  botToken: z.string().max(100, 'Discord bot token too long').or(z.literal(''))
});

export const updateSettingsSchema = z.object({
  jellyfinUrl: z.string().url('Invalid Jellyfin URL').max(2048, 'URL too long'),
  apiKey: z.string().max(500, 'API key too long').optional().or(z.literal('')),
  smtp: smtpSchema,
  discord: discordSchema
});

// Password reset validation
export const requestPasswordResetSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema
});

// User profile update validation
export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  email: emailSchema.optional(),
  discordUsername: z.string().max(100, 'Discord username too long').optional()
});

// Notification settings validation
export const updateNotificationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  discordEnabled: z.boolean().optional(),
  expiryReminders: z.boolean().optional(),
  accountExpiryWarnings: z.boolean().optional()
});

// Admin user update validation
export const updateUserSchema = z.object({
  displayName: displayNameSchema.optional(),
  email: emailSchema.optional(),
  discordUsername: z.string().max(100, 'Discord username too long').optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  accountExpiry: z.string().datetime('Invalid expiry date').nullable().optional()
});

// Quick connect validation
export const quickConnectSchema = z.object({
  code: z.string().length(6, 'Quick connect code must be 6 characters').regex(/^\d{6}$/, 'Quick connect code must be numeric')
});

// Jellyfin validation
export const jellyfinLoginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
});

// Service test validation
export const testEmailSchema = z.object({
  to: emailSchema,
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  body: z.string().min(1, 'Body is required').max(10000, 'Body too long')
});

export const testDiscordSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long')
});

// Setup validation (matches actual setup endpoint usage)
// Transform empty strings to undefined for optional fields
const optionalString = z.string().transform(v => v === '' ? undefined : v).pipe(z.string().optional());
const optionalEmail = z.string().transform(v => v === '' ? undefined : v).pipe(emailSchema.optional());
const optionalUrl = z.string().transform(v => v === '' ? undefined : v).pipe(z.string().url('Invalid URL').max(2048, 'URL too long').optional());
const optionalMinString = (minLen: number, maxLen: number, message: string) => 
  z.string().transform(v => v === '' ? undefined : v).pipe(z.string().min(minLen, message).max(maxLen).optional());

export const setupSchema = z.object({
  appUrl: z.string().url('Invalid application URL').max(2048, 'URL too long'),
  jellyfinUrl: z.string().url('Invalid Jellyfin URL').max(2048, 'URL too long'),
  adminUsername: usernameSchema,
  adminPassword: passwordSchema,
  adminEmail: optionalEmail,
  smtpHost: optionalString,
  smtpPort: z.number().int().min(1, 'Port must be positive').max(65535, 'Invalid port number').optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: optionalString,
  smtpPass: optionalString,
  smtpFrom: optionalEmail,
  discordBotToken: optionalMinString(50, 100, 'Discord bot token too short'),
  oidcEnabled: z.boolean().optional(),
  oidcProviderName: optionalString,
  oidcDiscoveryUrl: optionalUrl,
  oidcClientId: optionalMinString(1, 200, 'Client ID is required'),
  oidcClientSecret: optionalMinString(1, 200, 'Client secret is required'),
  enableRegistration: z.boolean().optional(),
  enableNotifications: z.boolean().optional()
});

// Type exports for TypeScript
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type QuickConnectInput = z.infer<typeof quickConnectSchema>;
export type JellyfinLoginInput = z.infer<typeof jellyfinLoginSchema>;
export type TestEmailInput = z.infer<typeof testEmailSchema>;
export type TestDiscordInput = z.infer<typeof testDiscordSchema>;
export type SetupInput = z.infer<typeof setupSchema>;