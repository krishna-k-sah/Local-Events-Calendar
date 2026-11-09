/**
 * EventHub Production Environment Variable Validator
 * Validates configuration at startup and fails fast if critical secrets or settings are missing.
 */

export function validateEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  const errors = [];
  const warnings = [];

  // 1. Mandatory DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is not defined in the environment.');
  }

  // 2. Strict checks for production and staging
  if (env === 'production' || env === 'staging') {
    const COMPROMISED_SECRETS = [
      'eventhub-super-secret-jwt-key-2026-production',
      'c489ab71e82d338f90bb353cfc87f5812fa9084920612ce2e56d78d9101f3014c44a2b6f',
    ];
    
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET must be defined in production/staging environments.');
    } else if (COMPROMISED_SECRETS.includes(process.env.JWT_SECRET)) {
      errors.push('JWT_SECRET cannot use a default, sample, or compromised secret in production/staging.');
    } else if (process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long for cryptographic security.');
    }

    if (!process.env.CLIENT_URL) {
      warnings.push('CLIENT_URL is not set. Cross-origin requests from the web frontend will be blocked by CORS.');
    } else if (env === 'production') {
      const origins = process.env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean);
      for (const origin of origins) {
        if (!origin.startsWith('https://') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
          warnings.push(`Production CLIENT_URL origin "${origin}" should use secure HTTPS protocol.`);
        }
      }
    }
  }

  // 3. Port numeric validation
  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    errors.push(`PORT environment variable must be a valid integer, received: "${process.env.PORT}".`);
  }

  // Emit warnings
  if (warnings.length > 0) {
    warnings.forEach((warn) => console.warn(`⚠️  CONFIG WARNING: ${warn}`));
  }

  // Handle fatal configuration errors
  if (errors.length > 0) {
    console.error('❌ FATAL CONFIGURATION ERRORS DETECTED:');
    errors.forEach((err) => console.error(`   - ${err}`));
    if (env === 'production' || env === 'staging') {
      console.error('🛑 Halting process startup due to insecure/missing environment configuration.');
      process.exit(1);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

