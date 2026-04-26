const { ipKeyGenerator } = require('express-rate-limit');
const { isProduction } = require('./env');

function hasRequiredSslMode(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const sslMode = String(parsed.searchParams.get('sslmode') || '').trim().toLowerCase();
    return sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full';
  } catch {
    return /(?:^|[?&])sslmode=require(?:&|$)/i.test(connectionString);
  }
}

function getDatabaseUsername(connectionString) {
  try {
    return decodeURIComponent(new URL(connectionString).username || '');
  } catch {
    return '';
  }
}

function getRequestIpKey(req) {
  return ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown');
}

function getRequestSourceIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const fallback = String(req.ip || req.socket?.remoteAddress || '').trim();
  return (forwarded || fallback || 'unknown').slice(0, 120);
}

function validateSecurityConfiguration(databaseUrl) {
  if (!isProduction) return;

  if (!hasRequiredSslMode(databaseUrl)) {
    throw new Error('DATABASE_URL must include sslmode=require in production.');
  }

  const sessionSecret = String(process.env.SESSION_JWT_SECRET || '').trim();
  const masterOtp = String(process.env.MASTER_OTP || '').trim();
  if (!sessionSecret || sessionSecret === 'change-me-in-production' || sessionSecret === masterOtp) {
    throw new Error('SESSION_JWT_SECRET must be set in production and must be different from MASTER_OTP.');
  }

  const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '').trim();
  if (configuredOrigins.includes('*')) {
    throw new Error('CORS_ALLOWED_ORIGINS cannot contain wildcard values in production.');
  }

  const databaseUsername = getDatabaseUsername(databaseUrl).toLowerCase();
  if (databaseUsername === 'neondb_owner' || databaseUsername.endsWith('_owner')) {
    console.warn('⚠️ DATABASE_URL is using an owner-level database role. Prefer a least-privilege Postgres role for the API.');
  }
}

module.exports = {
  hasRequiredSslMode,
  getDatabaseUsername,
  getRequestIpKey,
  getRequestSourceIp,
  validateSecurityConfiguration,
};
