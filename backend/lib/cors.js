const { isProduction } = require('./env');

const envOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const allowPreviewOrigins = String(process.env.ALLOW_VERCEL_PREVIEW_ORIGINS || '').trim().toLowerCase() === 'true';

const allowedOrigins = new Set([
  'https://www.bolo237.com',
  'https://admin.bolo237.com',
  ...envOrigins,
  ...(!isProduction ? ['http://localhost:3000', 'http://localhost:3001'] : []),
]);

function isAllowedOrigin(origin) {
  if (allowedOrigins.has(origin)) return true;

  if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }

  if (allowPreviewOrigins && /^https:\/\/[a-z0-9-]*bolo237[a-z0-9-]*\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
};

module.exports = { isAllowedOrigin, corsOptions, allowedOrigins };
