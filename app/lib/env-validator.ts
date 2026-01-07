/**
 * Environment variable validation utility
 * Validates required environment variables at startup
 */

interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
];

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED_ENV_VARS = [
  'LOG_LEVEL',
  'NODE_ENV',
];

/**
 * Validate environment variables at startup
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Check recommended variables
  for (const envVar of RECOMMENDED_ENV_VARS) {
    if (!process.env[envVar]) {
      warnings.push(`Missing recommended environment variable: ${envVar}`);
    }
  }

  // Validate NEXTAUTH_URL format if present
  if (process.env.NEXTAUTH_URL) {
    try {
      new URL(process.env.NEXTAUTH_URL);
    } catch {
      errors.push(`Invalid NEXTAUTH_URL format: ${process.env.NEXTAUTH_URL}`);
    }
  }

  // Validate NODE_ENV if present
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    errors.push(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Must be 'development', 'production', or 'test'.`);
  }

  // Validate LOG_LEVEL if present
  if (process.env.LOG_LEVEL) {
    const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
    if (!validLevels.includes(process.env.LOG_LEVEL.toLowerCase())) {
      errors.push(`Invalid LOG_LEVEL: ${process.env.LOG_LEVEL}. Must be one of: ${validLevels.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Assert that environment is valid, throw if not
 */
export function assertEnvironmentValid(): void {
  const result = validateEnvironment();

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment Warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (!result.isValid) {
    console.error('❌ Environment Validation Failed:');
    result.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error(`Invalid environment configuration. ${result.errors.length} error(s) found.`);
  }

  console.log('✅ Environment validation passed');
}
