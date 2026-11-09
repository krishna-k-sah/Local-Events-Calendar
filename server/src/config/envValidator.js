import crypto from 'crypto';

/**
 * EventHub Production Environment Variable Validator
 * Validates configuration at startup and fails fast if critical secrets or settings are missing.
 */

// Cryptographic one-way SHA-256 fingerprints of prohibited/compromised secrets
// (Never store plaintext secrets in source code)
const BLACKLISTED_SECRET_HASHES = new Set([
  '4b685235e2be9859d015ffb58fddc5a6f6ef8d7feda55c4eb34149e89f4c27af', // Default development secret
  'f82c904b98f84ee9d07ebb91fbb97809aafe6206fad93febb05dc2dd36c8ddf0', // Compromised Phase 6.6.3 sample secret
]);

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
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET must be defined in production/staging environments.');
    } else {
      const secretHash = crypto.createHash('sha256').update(process.env.JWT_SECRET).digest('hex');
      if (BLACKLISTED_SECRET_HASHES.has(secretHash)) {
        errors.push('JWT_SECRET matches a known compromised or default development secret fingerprint.');
      } else if (process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long for cryptographic security.');
      }
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

