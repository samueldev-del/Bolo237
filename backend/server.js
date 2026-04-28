require('dotenv').config();
const Sentry = require('@sentry/node');

function getSampleRateFromEnv(name, fallbackValue) {
  const parsedValue = Number(process.env[name]);
  if (Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 1) {
    return parsedValue;
  }

  return fallbackValue;
}

const sentryDsn = String(process.env.SENTRY_DSN || '').trim();
const sentryEnabled = Boolean(sentryDsn);

Sentry.init({
  enabled: sentryEnabled,
  dsn: sentryDsn || undefined,
  sendDefaultPii: true,
  includeLocalVariables: true,
  environment: String(process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development').trim() || 'development',
  release: String(process.env.SENTRY_RELEASE || '').trim() || undefined,
  tracesSampleRate: getSampleRateFromEnv(
    'SENTRY_TRACES_SAMPLE_RATE',
    process.env.NODE_ENV === 'production' ? 0.1 : 1,
  ),
  profilesSampleRate: getSampleRateFromEnv('SENTRY_PROFILES_SAMPLE_RATE', 0),
  enableLogs: true,
});

const express = require('express');
const startJobArchiver = require('./cron/jobArchiver');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const {
  archiveAdminInboxTicket,
  downloadAdminInboxAttachment,
  getAdminInbox,
  getAdminInboxSummary,
  markAdminInboxTicketRead,
  replyToAdminInboxTicket,
  trashAdminInboxTicket,
} = require('./lib/adminInboxService');
const {
  sendAccountVerifiedEmail,
  sendApplicationReceivedEmail,
  sendApplicationSentEmail,
  sendJobQueuedEmail,
  sendPasswordResetCodeEmail,
  sendPasswordResetConfirmationEmail,
  sendWelcomeEmail,
} = require('./lib/transactionalEmail');

function logFatalError(label, error) {
  if (error instanceof Error) {
    console.error(`❌ [FATAL] ${label}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return;
  }

  console.error(`❌ [FATAL] ${label}:`, error);
}

function reportError(label, error, context = {}) {
  console.error(`${label}:`, error);

  Sentry.withScope((scope) => {
    scope.setTag('service', 'backend');
    scope.setTag('error_label', String(label || 'backend_error'));
    Object.entries(context || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        scope.setExtra(key, value);
      }
    });
    Sentry.captureException(error);
  });
}

async function flushSentry(timeoutMs = 2000) {
  if (!sentryEnabled) return;

  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // Ignore flush failures during shutdown paths.
  }
}

process.on('uncaughtException', async (error) => {
  logFatalError('Uncaught exception', error);
  Sentry.captureException(error);
  await flushSentry();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  logFatalError('Unhandled promise rejection', reason);
  Sentry.captureException(reason);
  await flushSentry();
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const isProduction = process.env.NODE_ENV === 'production';

function getDatabaseUrl() {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  return databaseUrl;
}

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

function getPositiveIntegerEnv(name, fallbackValue) {
  const rawValue = Number(process.env[name]);
  if (Number.isFinite(rawValue) && rawValue > 0) {
    return Math.floor(rawValue);
  }

  return fallbackValue;
}

function getRequestIpKey(req) {
  return ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown');
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

// --- Database setup ---
const DATABASE_URL = getDatabaseUrl();
validateSecurityConfiguration(DATABASE_URL);

const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.set('trust proxy', 1);
const SESSION_COOKIE_NAME = 'bolo237_session';
const SESSION_JWT_SECRET = process.env.SESSION_JWT_SECRET || 'change-me-in-production';
const revokedSessionTokens = new Map(); // token -> expiresAtMs

const uploadsRoot = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Configuration du transporteur Hostinger
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 465),
  secure: true, // true pour le port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Log Twilio status at startup
if (twilioClient) {
  console.log('✅ Twilio client initialized');
  if (process.env.TWILIO_WHATSAPP_FROM && process.env.TWILIO_WHATSAPP_TO) {
    console.log(`✅ WhatsApp alerts: FROM=${process.env.TWILIO_WHATSAPP_FROM} TO=${process.env.TWILIO_WHATSAPP_TO}`);
  } else {
    console.warn('⚠️ Twilio client OK but TWILIO_WHATSAPP_FROM or TWILIO_WHATSAPP_TO missing — WhatsApp alerts disabled');
  }
} else {
  console.warn('⚠️ Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing) — WhatsApp alerts disabled');
}

// Log Cloudinary status
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  console.log('✅ Cloudinary configured');
} else {
  console.warn('⚠️ Cloudinary not configured — file uploads will fail');
}

async function sendWhatsAppModerationAlert(messageBody) {
  if (!twilioClient) {
    console.log('📩 [WhatsApp SKIP - no client]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }
  if (!process.env.TWILIO_WHATSAPP_FROM || !process.env.TWILIO_WHATSAPP_TO) {
    console.log('📩 [WhatsApp SKIP - no FROM/TO]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }

  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.TWILIO_WHATSAPP_TO,
      body: messageBody,
    });
    console.log('📩 [WhatsApp SENT]', messageBody.split('\n')[0]);
    return { delivery: 'sent', sent: 1 };
  } catch (error) {
    console.error('📩 [WhatsApp ERROR]', error?.message || error);
    return { delivery: 'error', sent: 0 };
  }
}

function parseCommaSeparatedValues(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeWhatsAppTarget(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('whatsapp:')) return trimmed;
  return `whatsapp:${trimmed.replace(/^\+?/, '+')}`;
}

function getInternalAlertWhatsAppTargets() {
  const configuredTargets = parseCommaSeparatedValues(process.env.ADMIN_INTERNAL_ALERT_WHATSAPP_TO || process.env.TWILIO_WHATSAPP_TO);
  return configuredTargets
    .map((target) => normalizeWhatsAppTarget(target))
    .filter(Boolean);
}

function getInternalAlertEmailRecipients(admins) {
  const recipients = new Set(parseCommaSeparatedValues(process.env.ADMIN_INTERNAL_ALERT_EMAILS));

  admins.forEach((admin) => {
    if (admin?.email) {
      recipients.add(String(admin.email).trim());
    }
  });

  return Array.from(recipients).filter(Boolean);
}

async function sendWhatsAppAlertToTargets(messageBody, targets) {
  if (!twilioClient) {
    console.log('📩 [WhatsApp SKIP - no client]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }
  if (!process.env.TWILIO_WHATSAPP_FROM) {
    console.log('📩 [WhatsApp SKIP - no FROM]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }

  const resolvedTargets = (Array.isArray(targets) ? targets : []).filter(Boolean);
  if (resolvedTargets.length === 0) {
    console.log('📩 [WhatsApp SKIP - no targets]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }

  try {
    await Promise.all(
      resolvedTargets.map((target) => twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: target,
        body: messageBody,
      }))
    );
    console.log('📩 [WhatsApp SENT]', messageBody.split('\n')[0]);
    return { delivery: 'sent', sent: resolvedTargets.length };
  } catch (error) {
    console.error('📩 [WhatsApp ERROR]', error?.message || error);
    return { delivery: 'error', sent: 0 };
  }
}

async function sendInternalAlertEmail({ subject, text, admins, replyTo }) {
  const recipients = getInternalAlertEmailRecipients(admins);

  if (recipients.length === 0) {
    console.log('[ADMIN ALERT EMAIL SKIP] No recipients configured');
    return { delivery: 'skipped', sent: 0 };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipients.join(','),
      replyTo,
      subject,
      text,
    });
    console.log('[ADMIN ALERT EMAIL SENT]', subject);
    return { delivery: 'sent', sent: recipients.length };
  } catch (error) {
    console.error('[ADMIN ALERT EMAIL ERROR]', error?.message || error);
    return { delivery: 'error', sent: 0 };
  }
}

function buildInternalAlertText({ title, message, type, data }) {
  const lines = [
    `[Bolo237] ${title}`,
    `Type: ${type}`,
    '',
    message,
  ];

  if (data && typeof data === 'object') {
    const entries = Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);

    if (entries.length > 0) {
      lines.push('', 'Meta:', ...entries);
    }
  }

  return lines.join('\n');
}

async function sendOtpWithTwilio(phone, code) {
  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
    return false;
  }

  const normalizedPhone = String(phone).startsWith('+') ? String(phone) : `+${String(phone).replace(/^\+/, '')}`;

  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalizedPhone,
      body: `Votre code Bolo237 est ${code}. Il expire dans 5 minutes.`,
    });
    console.log(`[OTP] SMS sent to ${normalizedPhone}`);
    return true;
  } catch (error) {
    console.error('[OTP] Twilio SMS error:', error?.message || error);
    return false;
  }
}

// --- Middleware ---
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

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));

const apiGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requetes depuis cette IP. Reessayez dans 15 minutes.' },
});

const signupIpLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('SIGNUP_IP_DAILY_LIMIT', 3),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRequestIpKey(req),
  message: {
    error: 'Trop de creations de compte depuis cette IP aujourd hui. Reessayez demain ou contactez le support.',
  },
});

const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => getRequestIpKey(req),
  message: { error: 'Trop de tentatives de connexion depuis cette IP. Reessayez dans 15 minutes.' },
});

const loginIdentifierLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const loginIdentifier = String(req.body?.identifier || req.body?.email || req.body?.phone || '')
      .trim()
      .toLowerCase();

    return loginIdentifier || getRequestIpKey(req);
  },
  message: { error: 'Trop de tentatives de connexion pour cet identifiant. Reessayez dans 15 minutes.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de demandes de reinitialisation pour ce numero. Reessayez dans 15 minutes.' },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de tentatives de reinitialisation pour ce numero. Reessayez dans 15 minutes.' },
});

const verificationSubmissionLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('VERIFICATION_SUBMISSION_DAILY_LIMIT', 6),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const accountKey = String(req.body?.accountKey || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return accountKey || phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de demandes de verification aujourd hui. Reessayez plus tard.' },
});

const candidateProfileLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: getPositiveIntegerEnv('CANDIDATE_PROFILE_HOURLY_LIMIT', 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = parseInt(String(req.body?.userId || ''), 10);
    return Number.isFinite(userId) && userId > 0 ? `candidate-profile:${userId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop de mises a jour de profil candidat. Reessayez dans une heure.' },
});

const savedJobsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: getPositiveIntegerEnv('SAVED_JOBS_15M_LIMIT', 120),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = parseInt(String(req.params?.id || req.body?.userId || ''), 10);
    return Number.isFinite(userId) && userId > 0 ? `saved-jobs:${userId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop de modifications sur vos favoris. Reessayez dans 15 minutes.' },
});

const jobApplicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: getPositiveIntegerEnv('JOB_APPLICATION_HOURLY_LIMIT', 30),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const candidateId = parseInt(String(req.body?.candidateId || ''), 10);
    return Number.isFinite(candidateId) && candidateId > 0 ? `job-apply:${candidateId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop de candidatures envoyees en une heure. Reessayez plus tard.' },
});

const jobCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('JOB_CREATION_DAILY_LIMIT', 12),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const authorId = parseInt(String(req.body?.authorId || ''), 10);
    return Number.isFinite(authorId) && authorId > 0 ? `job-create:${authorId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop d annonces creees aujourd hui. Reessayez demain ou contactez le support.' },
});

const feedbackSubmissionLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('APP_FEEDBACK_DAILY_LIMIT', 5),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = parseInt(String(req.body?.userId || ''), 10);
    return Number.isFinite(userId) && userId > 0 ? `app-feedback:${userId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop de retours envoyes aujourd hui. Merci de reessayer plus tard.' },
});

const reviewSubmissionLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('USER_REVIEW_DAILY_LIMIT', 12),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const reviewerId = parseInt(String(req.body?.reviewerId || ''), 10);
    return Number.isFinite(reviewerId) && reviewerId > 0 ? `user-review:${reviewerId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop d avis envoyes aujourd hui. Reessayez demain.' },
});

const uploadIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: getPositiveIntegerEnv('UPLOAD_IP_15M_LIMIT', 25),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRequestIpKey(req),
  message: { error: 'Trop de televersements depuis cette IP. Reessayez dans 15 minutes.' },
});

app.use('/api', apiGlobalLimiter);
app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(uploadsRoot));
app.use('/api/admin', requireAdminSession);

function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredSameSite = String(process.env.SESSION_COOKIE_SAMESITE || '').trim().toLowerCase();
  const sameSite = configuredSameSite === 'strict' || configuredSameSite === 'lax' || configuredSameSite === 'none'
    ? configuredSameSite
    : (isProd ? 'none' : 'lax');

  // Browsers require `Secure` when SameSite=None.
  const forceSecure = String(process.env.SESSION_COOKIE_SECURE || '').trim().toLowerCase() === 'true';
  const secure = forceSecure || isProd || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function getSessionCookieClearOptions() {
  const { maxAge: _maxAge, ...cookieOptions } = getSessionCookieOptions();
  return cookieOptions;
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieClearOptions());
}

function createSessionToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, jti },
    SESSION_JWT_SECRET,
    { expiresIn: '7d' }
  );

  return token;
}

function readSessionToken(req) {
  const raw = req.cookies?.[SESSION_COOKIE_NAME];
  if (!raw) return null;

  const revokedUntil = revokedSessionTokens.get(raw);
  const now = Date.now();
  if (revokedUntil && revokedUntil > now) {
    return null;
  }
  if (revokedUntil && revokedUntil <= now) {
    revokedSessionTokens.delete(raw);
  }

  try {
    const payload = jwt.verify(raw, SESSION_JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

async function requireAdminSession(req, res, next) {
  try {
    const payload = readSessionToken(req);
    if (!payload?.userId) {
      return res.status(401).json({ error: 'Session admin requise.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.userId) },
      select: { id: true, role: true, isBanned: true },
    });

    if (!user || user.isBanned) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const role = String(user.role || '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acces admin requis.' });
    }

    req.adminUserId = user.id;
    return next();
  } catch (error) {
    console.error('requireAdminSession error:', error);
    return res.status(500).json({ error: 'Erreur de verification admin.' });
  }
}

async function requireUserSession(req, res, next) {
  try {
    const payload = readSessionToken(req);
    if (!payload?.userId) {
      return res.status(401).json({ error: 'Session requise.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.userId) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        photoUrl: true,
        isVerified: true,
        isBanned: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Session invalide.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Compte banni.' });
    }

    req.sessionUser = user;
    return next();
  } catch (error) {
    console.error('requireUserSession error:', error);
    return res.status(500).json({ error: 'Erreur de verification utilisateur.' });
  }
}

const REPORT_TARGET_ALLOWLIST = new Set(['annonce', 'artisan']);
const REPORT_REASON_ALLOWLIST = new Set(['demande-argent', 'fausse-identite', 'artisan-injoignable']);
const REPORT_DEDUPE_WINDOW_MS = 12 * 60 * 60 * 1000;
const REPORT_REVIEW_THRESHOLD = 3;
const PRIVACY_REQUEST_KIND_ALLOWLIST = new Set(['EXPORT', 'DELETE']);
const PRIVACY_REQUEST_STATUS_ALLOWLIST = new Set(['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED']);
const recentReportSubmissions = new Map();

function parsePositiveInt(value) {
  const parsed = parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeReportTargetType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return REPORT_TARGET_ALLOWLIST.has(normalized) ? normalized : null;
}

function normalizeReportReason(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return REPORT_REASON_ALLOWLIST.has(normalized) ? normalized : null;
}

function cleanupRecentReportSubmissions(now = Date.now()) {
  for (const [key, expiresAt] of recentReportSubmissions.entries()) {
    if (expiresAt <= now) {
      recentReportSubmissions.delete(key);
    }
  }
}

function getRequestFingerprint(req) {
  const ipPart = ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown');
  const userAgent = String(req.get('user-agent') || 'unknown').slice(0, 180);
  return crypto.createHash('sha256').update(`${ipPart}|${userAgent}`).digest('hex');
}

async function reportTargetExists(targetType, targetId) {
  if (targetType === 'annonce') {
    const count = await prisma.job.count({ where: { id: targetId } });
    return count > 0;
  }

  const count = await prisma.userProfile.count({ where: { userId: targetId } });
  return count > 0;
}

async function buildReportSummary(targetType, targetId) {
  const [totalReports, openReports] = await prisma.$transaction([
    prisma.report.count({ where: { targetType, targetId } }),
    prisma.report.count({ where: { targetType, targetId, status: 'OPEN' } }),
  ]);

  return {
    targetType,
    targetId,
    totalReports,
    openReports,
    reviewThreshold: REPORT_REVIEW_THRESHOLD,
    reviewThresholdReached: openReports >= REPORT_REVIEW_THRESHOLD,
  };
}

function buildPrivacyReference(prefix) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function normalizePrivacyRequestKind(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return PRIVACY_REQUEST_KIND_ALLOWLIST.has(normalized) ? normalized : null;
}

function normalizePrivacyRequestStatus(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return PRIVACY_REQUEST_STATUS_ALLOWLIST.has(normalized) ? normalized : null;
}

function normalizePrivacyNotes(value) {
  if (value === undefined) return undefined;
  return String(value || '').trim().slice(0, 4000);
}

function getRequestSourceIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const fallback = String(req.ip || req.socket?.remoteAddress || '').trim();
  return (forwarded || fallback || 'unknown').slice(0, 120);
}

async function createPrivacyRequestLog({ reference, kind, status = 'PENDING', user, reason, delivery, req, notes, payload, processedAt, processedBy }) {
  return prisma.privacyRequest.create({
    data: {
      reference,
      kind,
      status,
      userId: user?.id || null,
      requesterEmail: String(user?.email || ''),
      requesterPhone: user?.phone || null,
      requesterRole: user?.role || null,
      requesterName: user?.name || null,
      reason: reason || null,
      delivery: delivery || null,
      sourceIp: req ? getRequestSourceIp(req) : null,
      userAgent: String(req?.get?.('user-agent') || '').trim().slice(0, 400) || null,
      notes: notes || null,
      payload: payload || undefined,
      processedAt: processedAt || null,
      processedBy: processedBy || null,
    },
  });
}

async function notifyPrivacyTeam({ subject, text, replyTo }) {
  const recipient = process.env.EMAIL_USER || 'contact@bolo237.com';

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipient,
      replyTo,
      subject,
      text,
    });
    return 'email';
  } catch (error) {
    console.error('Privacy notification email error:', error?.message || error);
    console.log(`[PRIVACY REQUEST] ${subject}\n${text}`);
    return 'log';
  }
}

const reportSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown'),
  message: { error: 'Trop de signalements depuis cette IP. Reessayez plus tard.' },
});

const privacyRequestLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown'),
  message: { error: 'Trop de demandes de confidentialite pour le moment. Reessayez plus tard.' },
});

// Verification queue is persisted via Prisma VerificationSubmission model

// =============================================
// In-memory store: Admin platform settings
// =============================================
const SETTINGS_PATH = path.join(__dirname, 'admin-settings.json');
const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailOnNewReport: true,
  whatsappOnNewJob: true,
  emailOnInternalAdminAlert: true,
  whatsappOnInternalAdminAlert: true,
};
const DEFAULT_SETTINGS = {
  platformName: 'Bolo237',
  maintenanceMode: false,
  moderationRules: { autoApproveAfterPosts: 3, blockedKeywords: ['frais de dossier', 'transfert mobile money', 'investissement'] },
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
};

function normalizePlatformSettings(input = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  const rawModerationRules = raw.moderationRules && typeof raw.moderationRules === 'object' ? raw.moderationRules : {};
  const rawNotificationPreferences = raw.notificationPreferences && typeof raw.notificationPreferences === 'object'
    ? raw.notificationPreferences
    : {};

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    moderationRules: {
      ...DEFAULT_SETTINGS.moderationRules,
      ...rawModerationRules,
    },
    notificationPreferences: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...rawNotificationPreferences,
    },
  };
}

let platformSettings = DEFAULT_SETTINGS;
try { platformSettings = normalizePlatformSettings(JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))); } catch { /* use defaults */ }

// candidateProfiles, userProfiles, savedJobs are now in the database (Prisma)

function profileFromBody(userId, body) {
  return {
    userId,
    fullName: String(body.fullName || ''),
    title: String(body.title || ''),
    location: String(body.location || ''),
    phone: String(body.phone || ''),
    email: String(body.email || ''),
    profile: String(body.profile || ''),
    experience: String(body.experience || ''),
    education: String(body.education || ''),
    skillsText: String(body.skillsText || ''),
    languagesText: String(body.languagesText || ''),
    updatedAt: new Date().toISOString(),
  };
}

function calcCvMajJours(createdAtIso) {
  const diff = Date.now() - new Date(createdAtIso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

async function createNotification({ userId, type, title, message, data }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data || undefined,
    },
  });
}

function parseDateOnlyFilter(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildDateRangeFilter(fieldName, startDate, endDate) {
  const range = {};

  if (startDate) {
    range.gte = startDate;
  }

  if (endDate) {
    const nextDay = new Date(endDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    range.lt = nextDay;
  }

  return Object.keys(range).length > 0 ? { [fieldName]: range } : {};
}

async function createAdminNotifications({
  title,
  message,
  type = 'admin_alert',
  data,
  excludeUserIds = [],
  emailAlert = false,
  whatsappAlert = false,
  replyTo,
}) {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      isBanned: false,
      ...(excludeUserIds.length ? { id: { notIn: excludeUserIds } } : {}),
    },
    select: { id: true, email: true, name: true },
  });

  if (admins.length === 0) {
    return { sent: 0, emailDelivery: 'skipped', whatsappDelivery: 'skipped' };
  }

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        type,
        title,
        message,
        data,
      })
    )
  );

  const realtimeText = buildInternalAlertText({ title, message, type, data });
  const notificationPreferences = platformSettings?.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
  const [emailResult, whatsappResult] = await Promise.all([
    emailAlert && notificationPreferences.emailOnInternalAdminAlert
      ? sendInternalAlertEmail({ subject: `[Bolo237] ${title}`, text: realtimeText, admins, replyTo })
      : Promise.resolve({ delivery: 'skipped', sent: 0 }),
    whatsappAlert && notificationPreferences.whatsappOnInternalAdminAlert
      ? sendWhatsAppAlertToTargets(realtimeText, getInternalAlertWhatsAppTargets())
      : Promise.resolve({ delivery: 'skipped', sent: 0 }),
  ]);

  return {
    sent: admins.length,
    emailDelivery: emailResult.delivery,
    whatsappDelivery: whatsappResult.delivery,
  };
}

function buildDateBuckets(days) {
  const labels = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(d);
  }

  return labels;
}

function toDayKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(date, locale = 'fr-FR') {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
  });
}

// =============================================
// ROUTES: Jobs (Offres d'emploi)
// =============================================

// GET /api/jobs — Liste des offres (avec filtres optionnels)
app.get('/api/jobs', async (req, res) => {
  try {
    const { status, location, search, authorId, page = '1', limit = '20' } = req.query;
    const searchTerm = search ? String(search).trim() : '';
    const numericSearch = searchTerm.replace(/^#/, '');
    const exactSearchId = /^\d+$/.test(numericSearch) ? parseInt(numericSearch, 10) : null;

    const where = {};
    if (status) {
      const s = String(status);
      // Treat APPROVED and ACTIVE as equivalent for public listings
      if (s === 'APPROVED' || s === 'ACTIVE') {
        where.status = { in: ['APPROVED', 'ACTIVE'] };
      } else {
        where.status = s;
      }
    }
    if (authorId) {
      const parsedAuthorId = parseInt(String(authorId), 10);
      if (!isNaN(parsedAuthorId)) where.authorId = parsedAuthorId;
    }
    if (location) where.location = { contains: String(location), mode: 'insensitive' };
    if (searchTerm) {
      const searchConditions = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { company: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
      if (exactSearchId !== null) {
        searchConditions.unshift({ id: exactSearchId });
      }
      where.OR = searchConditions;
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * take;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { author: { select: { id: true, name: true, email: true, role: true, isVerified: true, photoUrl: true } } },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      jobs,
      pagination: { page: pageNum, limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error('GET /api/jobs error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des offres.' });
  }
});

// =============================================
// ROUTES: Verifications (Identite)
// =============================================

// GET /api/verifications — File complete des demandes
app.get('/api/verifications', requireAdminSession, async (_req, res) => {
  try {
    const items = await prisma.verificationSubmission.findMany({
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ items });
  } catch (error) {
    console.error('GET /api/verifications error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des verifications.' });
  }
});

// GET /api/verifications/status?role=artisan&accountKey=abc
app.get('/api/verifications/status', async (req, res) => {
  const { role, accountKey } = req.query;
  if (!role || !accountKey) {
    return res.status(400).json({ error: 'Parametres requis: role, accountKey.' });
  }

  try {
    const existing = await prisma.verificationSubmission.findFirst({
      where: {
        role: String(role).toLowerCase(),
        accountKey: String(accountKey).toLowerCase(),
      },
    });
    res.json({ status: existing?.status || 'not_submitted' });
  } catch (error) {
    console.error('GET /api/verifications/status error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du statut.' });
  }
});

// POST /api/verifications — Soumettre ou re-soumettre une demande
app.post('/api/verifications', verificationSubmissionLimiter, async (req, res) => {
  try {
    const { role, accountKey, displayName, phone, payload } = req.body;

    if (!role || !accountKey || !displayName || !phone || !payload) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants: role, accountKey, displayName, phone, payload.',
      });
    }

    const normalizedRole = String(role).toLowerCase();
    const normalizedKey = String(accountKey).toLowerCase();

    const submission = await prisma.verificationSubmission.upsert({
      where: { role_accountKey: { role: normalizedRole, accountKey: normalizedKey } },
      create: {
        role: normalizedRole,
        accountKey: normalizedKey,
        displayName: String(displayName),
        phone: String(phone),
        status: 'pending',
        payload,
      },
      update: {
        displayName: String(displayName),
        phone: String(phone),
        status: 'pending',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        notes: null,
        payload,
      },
    });

    await sendWhatsAppModerationAlert(
      [
        'Nouvelle verification identite en attente',
        `ID: ${submission.id}`,
        `Role: ${submission.role}`,
        `Nom: ${submission.displayName}`,
        `Compte: ${submission.accountKey}`,
      ].join('\n')
    );

    res.status(201).json(submission);
  } catch (error) {
    reportError('POST /api/verifications error', error, { route: '/api/verifications' });
    res.status(500).json({ error: 'Erreur lors de la soumission de verification.' });
  }
});

// PATCH /api/verifications/:id/review — Decision super admin
app.patch('/api/verifications/:id/review', requireAdminSession, async (req, res) => {
  const id = String(req.params.id);
  const { status, reviewedBy, notes } = req.body;

  if (!status || !['approved', 'rejected'].includes(String(status))) {
    return res.status(400).json({ error: 'Statut invalide. Valeurs autorisees: approved, rejected.' });
  }

  try {
    const existing = await prisma.verificationSubmission.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Demande de verification non trouvee.' });

    const updated = await prisma.verificationSubmission.update({
      where: { id },
      data: {
        status: String(status),
        reviewedBy: reviewedBy ? String(reviewedBy) : 'super-admin',
        reviewedAt: new Date(),
        notes: notes ? String(notes) : null,
      },
    });

    if (String(status) === 'approved') {
      // Try to find the user by payload.userId or by accountKey (email)
      const rawPayload = updated.payload || {};
      const maybeUserId = Number((typeof rawPayload === 'object' ? rawPayload.userId : null) || 0);
      let userToVerify = null;

      if (Number.isFinite(maybeUserId) && maybeUserId > 0) {
        userToVerify = await prisma.user.findUnique({ where: { id: maybeUserId } }).catch(() => null);
      }

      // Fallback: find by accountKey (email)
      if (!userToVerify && updated.accountKey) {
        userToVerify = await prisma.user.findUnique({ where: { email: updated.accountKey } }).catch(() => null);
      }

      if (userToVerify) {
        await prisma.user.update({
          where: { id: userToVerify.id },
          data: { isVerified: true },
        }).catch(() => null);

        const verifiedUser = { ...userToVerify, isVerified: true };

        await Promise.allSettled([
          createNotification({
            userId: userToVerify.id,
            type: 'account_verified',
            title: 'Compte certifie',
            message: 'Felicitations ! Votre identite a ete verifiee. Vous avez maintenant le badge certifie sur votre profil.',
            data: { verificationId: updated.id, role: updated.role },
          }),
          sendWhatsAppModerationAlert(
            `✅ Identite verifiee\nUser: ${userToVerify.name || userToVerify.email}\nRole: ${updated.role}`
          ),
          sendAccountVerifiedEmail({ transporter, user: verifiedUser }),
        ]);
      }
    }

    res.json(updated);
  } catch (error) {
    reportError('PATCH /api/verifications/:id/review error', error, {
      route: '/api/verifications/:id/review',
      verificationId: req.params.id,
    });
    res.status(500).json({ error: 'Erreur lors de la mise a jour de la verification.' });
  }
});

// =============================================
// ROUTES: Candidate Profiles / CVtheque
// =============================================

app.get('/api/candidates', async (_req, res) => {
  try {
    const rows = await prisma.candidateProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const candidates = rows.map((c) => ({ ...c, cvMajJours: calcCvMajJours(c.createdAt) }));
    res.json({ candidates });
  } catch (error) {
    console.error('GET /api/candidates error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des candidats.' });
  }
});

app.post('/api/candidates', candidateProfileLimiter, async (req, res) => {
  try {
    const {
      userId,
      nom,
      titre,
      localisation,
      experience = 'Confirme',
      disponibilite = 'Immediatement',
      etudes = 'Bac+3',
      competences = [],
      disponibleNow = true,
    } = req.body || {};

    if (!nom || !titre) {
      return res.status(400).json({ error: 'Champs requis: nom, titre.' });
    }

    const normalizedUserId = userId ? parseInt(String(userId), 10) : null;
    const data = {
      userId: normalizedUserId,
      nom: String(nom),
      titre: String(titre),
      localisation: String(localisation || 'Douala'),
      experience: String(experience),
      disponibilite: String(disponibilite),
      etudes: String(etudes),
      competences: Array.isArray(competences)
        ? competences.map((s) => String(s)).filter(Boolean).slice(0, 12)
        : [],
      disponibleNow: Boolean(disponibleNow),
    };

    const existing = normalizedUserId
      ? await prisma.candidateProfile.findFirst({ where: { userId: normalizedUserId } })
      : null;

    const item = existing
      ? await prisma.candidateProfile.update({ where: { id: existing.id }, data })
      : await prisma.candidateProfile.create({ data });

    await sendWhatsAppModerationAlert(
      [
        existing ? 'Profil candidat mis a jour' : 'Nouveau profil candidat cree',
        `ID: ${item.id}`,
        `Nom: ${item.nom}`,
        `Titre: ${item.titre}`,
        `Ville: ${item.localisation}`,
      ].join('\n')
    );

    res.status(existing ? 200 : 201).json({ ...item, cvMajJours: calcCvMajJours(item.createdAt) });
  } catch (error) {
    reportError('POST /api/candidates error', error, { route: '/api/candidates' });
    res.status(500).json({ error: 'Erreur lors de la creation du profil candidat.' });
  }
});

app.get('/api/candidates/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID candidat invalide.' });

    const candidate = await prisma.candidateProfile.findUnique({ where: { id } });
    if (!candidate) return res.status(404).json({ error: 'Profil candidat non trouve.' });

    const [user, userProfile] = await Promise.all([
      candidate.userId
        ? prisma.user.findUnique({
            where: { id: candidate.userId },
            select: { id: true, name: true, email: true, phone: true, isVerified: true, createdAt: true },
          })
        : Promise.resolve(null),
      candidate.userId
        ? prisma.userProfile.findUnique({ where: { userId: candidate.userId } })
        : Promise.resolve(null),
    ]);

    res.json({
      id: candidate.id,
      userId: candidate.userId,
      nom: candidate.nom,
      titre: candidate.titre,
      localisation: candidate.localisation,
      experience: candidate.experience,
      disponibilite: candidate.disponibilite,
      etudes: candidate.etudes,
      competences: candidate.competences,
      disponibleNow: candidate.disponibleNow,
      cvMajJours: calcCvMajJours(candidate.createdAt),
      createdAt: candidate.createdAt,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
          }
        : null,
      profile: userProfile
        ? {
            fullName: userProfile.fullName,
            title: userProfile.title,
            location: userProfile.location,
            phone: userProfile.phone,
            email: userProfile.email,
            profile: userProfile.profile,
            experience: userProfile.experience,
            education: userProfile.education,
            skillsText: userProfile.skillsText,
            languagesText: userProfile.languagesText,
            updatedAt: userProfile.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('GET /api/candidates/:id error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du profil candidat.' });
  }
});

// =============================================
// ROUTES: User Profiles
// =============================================

app.get('/api/profiles/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const existing = await prisma.userProfile.findUnique({ where: { userId } });
    if (!existing) return res.status(404).json({ error: 'Profil non trouve.' });
    res.json(existing);
  } catch (error) {
    console.error('GET /api/profiles/:userId error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du profil.' });
  }
});

app.put('/api/profiles/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const data = profileFromBody(userId, req.body || {});
    delete data.userId;
    delete data.updatedAt;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    res.json(profile);
  } catch (error) {
    console.error('PUT /api/profiles/:userId error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour du profil.' });
  }
});

// =============================================
// ROUTES: Saved Jobs
// =============================================

app.get('/api/users/:id/saved-jobs', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID invalide.' });

    const savedEntries = await prisma.savedJob.findMany({ where: { userId } });
    const ids = savedEntries.map((s) => s.jobId);
    if (ids.length === 0) return res.json({ jobs: [] });

    const jobs = await prisma.job.findMany({
      where: { id: { in: ids } },
      include: { author: { select: { id: true, name: true, email: true, role: true, isVerified: true, photoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ jobs });
  } catch (error) {
    console.error('GET /api/users/:id/saved-jobs error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des annonces sauvegardees.' });
  }
});

app.post('/api/users/:id/saved-jobs', savedJobsLimiter, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const jobId = parseInt(String(req.body?.jobId), 10);

    if (isNaN(userId) || isNaN(jobId)) {
      return res.status(400).json({ error: 'Parametres invalides: userId et jobId requis.' });
    }

    await prisma.savedJob.upsert({
      where: { userId_jobId: { userId, jobId } },
      update: {},
      create: { userId, jobId },
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('POST /api/users/:id/saved-jobs error:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
  }
});

app.delete('/api/users/:id/saved-jobs/:jobId', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const jobId = parseInt(req.params.jobId, 10);

    if (isNaN(userId) || isNaN(jobId)) {
      return res.status(400).json({ error: 'Parametres invalides: userId et jobId requis.' });
    }

    await prisma.savedJob.deleteMany({ where: { userId, jobId } });
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/users/:id/saved-jobs error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// GET /api/jobs/:id — Détail d'une offre
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const job = await prisma.job.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, email: true, role: true, isVerified: true, photoUrl: true } } },
    });

    if (!job) return res.status(404).json({ error: 'Offre non trouvée.' });
    res.json(job);
  } catch (error) {
    console.error('GET /api/jobs/:id error:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/jobs/:id/apply — Simuler une candidature et notifier l'entreprise
app.post('/api/jobs/:id/apply', jobApplicationLimiter, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (isNaN(jobId)) return res.status(400).json({ error: 'ID annonce invalide.' });

    const { candidateId, candidateName } = req.body || {};
    if (!candidateId) {
      return res.status(400).json({ error: 'candidateId requis.' });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, company: true, authorId: true },
    });

    if (!job) return res.status(404).json({ error: 'Offre non trouvee.' });

    const normalizedCandidateId = parseInt(String(candidateId), 10);
    if (isNaN(normalizedCandidateId)) {
      return res.status(400).json({ error: 'candidateId invalide.' });
    }

    const [user, userProfile, employer] = await Promise.all([
      prisma.user.findUnique({
        where: { id: normalizedCandidateId },
        select: { id: true, name: true, email: true, phone: true, isVerified: true },
      }),
      prisma.userProfile.findUnique({ where: { userId: normalizedCandidateId } }),
      prisma.user.findUnique({
        where: { id: job.authorId },
        select: { id: true, name: true, email: true, role: true },
      }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'Candidat introuvable.' });
    }

    const profileReady = Boolean(
      userProfile?.fullName &&
      userProfile?.title &&
      userProfile?.phone &&
      userProfile?.email &&
      (userProfile?.skillsText || userProfile?.experience || userProfile?.education)
    );

    if (!profileReady) {
      return res.status(400).json({ error: 'Le dossier candidat est incomplet. Completez le profil avant de postuler.' });
    }

    const candidateLabel = String(candidateName || user.name || user.email || `Candidat #${normalizedCandidateId}`);

    // Notify the enterprise (job author)
    const notif = await createNotification({
      userId: job.authorId,
      type: 'application_received',
      title: 'Nouvelle candidature',
      message: `${candidateLabel} a postule a votre offre: ${job.title}`,
      data: {
        jobId: job.id,
        candidateId: normalizedCandidateId,
        candidateName: candidateLabel,
      },
    });

    // Notify the candidate (confirmation)
    await createNotification({
      userId: normalizedCandidateId,
      type: 'application_sent',
      title: 'Candidature envoyee',
      message: `Votre candidature pour "${job.title}" chez ${job.company} a ete envoyee.`,
      data: {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
      },
    });

    await Promise.allSettled([
      sendApplicationReceivedEmail({
        transporter,
        employer,
        job,
        candidateName: candidateLabel,
      }),
      sendApplicationSentEmail({
        transporter,
        user,
        job,
      }),
    ]);

    res.status(201).json({ ok: true, notification: notif });
  } catch (error) {
    reportError('POST /api/jobs/:id/apply error', error, {
      route: '/api/jobs/:id/apply',
      jobId: req.params.id,
    });
    res.status(500).json({ error: 'Erreur lors de la candidature.' });
  }
});

// POST /api/jobs — Créer une offre
app.post('/api/jobs', jobCreationLimiter, async (req, res) => {
  try {
    const { title, company, location, description, salary, authorId } = req.body;

    if (!title || !company || !location || !description || !authorId) {
      return res.status(400).json({ error: 'Champs obligatoires manquants: title, company, location, description, authorId.' });
    }

    const normalizedAuthorId = parseInt(String(authorId), 10);
    if (isNaN(normalizedAuthorId)) {
      return res.status(400).json({ error: 'authorId invalide.' });
    }

    const author = await prisma.user.findUnique({
      where: { id: normalizedAuthorId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!author) {
      return res.status(404).json({ error: 'Auteur introuvable.' });
    }

    const job = await prisma.job.create({
      data: {
        title: String(title),
        company: String(company),
        location: String(location),
        description: String(description),
        salary: salary ? String(salary) : null,
        authorId: normalizedAuthorId,
        status: 'PENDING',
      },
    });

    await Promise.allSettled([
      sendWhatsAppModerationAlert(
        [
          'Nouvelle annonce en attente de moderation',
          `ID: ${job.id}`,
          `Titre: ${job.title}`,
          `Entreprise: ${job.company}`,
          `Lieu: ${job.location}`,
        ].join('\n')
      ),
      sendJobQueuedEmail({ transporter, author, job }),
    ]);

    res.status(201).json(job);
  } catch (error) {
    reportError('POST /api/jobs error', error, { route: '/api/jobs' });
    res.status(500).json({ error: "Erreur lors de la création de l'offre." });
  }
});

// PUT /api/jobs/:id — Modifier une offre
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const { title, company, location, description, salary, status } = req.body;

    const allowedStatuses = ['PENDING', 'ACTIVE', 'APPROVED', 'REJECTED', 'CLOSED'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs autorisees: ${allowedStatuses.join(', ')}` });
    }

    const data = {};
    if (title !== undefined) data.title = String(title);
    if (company !== undefined) data.company = String(company);
    if (location !== undefined) data.location = String(location);
    if (description !== undefined) data.description = String(description);
    if (salary !== undefined) data.salary = salary ? String(salary) : null;
    if (status !== undefined) data.status = String(status);

    const job = await prisma.job.update({ where: { id }, data });

    // After the job is updated, check if status changed and notify author
    if (status && (status === 'APPROVED' || status === 'ACTIVE' || status === 'REJECTED')) {
      const updatedJob = await prisma.job.findUnique({ where: { id }, select: { authorId: true, title: true } });
      if (updatedJob) {
        const statusLabel = (status === 'APPROVED' || status === 'ACTIVE') ? 'approuvee' : 'rejetee';
        await createNotification({
          userId: updatedJob.authorId,
          type: 'job_status_changed',
          title: status === 'REJECTED' ? 'Offre rejetee' : 'Offre approuvee',
          message: `Votre offre "${updatedJob.title}" a ete ${statusLabel} par l'equipe de moderation.`,
          data: { jobId: id, status },
        });
      }
    }

    res.json(job);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Offre non trouvée.' });
    console.error('PUT /api/jobs/:id error:', error);
    res.status(500).json({ error: "Erreur lors de la mise à jour." });
  }
});

// DELETE /api/jobs/:id — Supprimer une offre
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    await prisma.job.delete({ where: { id } });
    res.json({ message: 'Offre supprimée.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Offre non trouvée.' });
    console.error('DELETE /api/jobs/:id error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// =============================================
// ROUTES: Users
// =============================================

// GET /api/users — Liste des utilisateurs
app.get('/api/users', requireAdminSession, async (req, res) => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query;
    const searchTerm = search ? String(search).trim() : '';
    const numericSearch = searchTerm.replace(/^#/, '');
    const exactSearchId = /^\d+$/.test(numericSearch) ? parseInt(numericSearch, 10) : null;

    const where = {};
    if (role) where.role = String(role);
    if (searchTerm) {
      const searchConditions = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ];
      if (exactSearchId !== null) {
        searchConditions.unshift({ id: exactSearchId });
      }
      where.OR = searchConditions;
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * take;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: { id: true, email: true, name: true, role: true, photoUrl: true, isVerified: true, isBanned: true, banReason: true, bannedAt: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: { page: pageNum, limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des utilisateurs.' });
  }
});

// GET /api/users/:id — Détail d'un utilisateur
app.get('/api/users/:id', requireAdminSession, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isVerified: true, isBanned: true, banReason: true, bannedAt: true, createdAt: true, jobs: true },
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.json(user);
  } catch (error) {
    console.error('GET /api/users/:id error:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/users — Créer un utilisateur
app.post('/api/users', signupIpLimiter, async (req, res) => {
  try {
    const { email, password, name, role, phone } = req.body;
    const honeypotValue = String(req.body?.website || '').trim();

    if (honeypotValue) {
      console.warn(`⚠️ Honeypot inscription declenche depuis IP=${req.ip || 'unknown'}`);
      return res.status(400).json({ error: 'Impossible de traiter cette inscription.' });
    }

    if (!phone || !password) {
      return res.status(400).json({ error: 'Numero de telephone et mot de passe requis.' });
    }

    const normalizedPhone = String(phone).trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (normalizedEmail) {
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) return res.status(409).json({ error: 'Cet email est deja utilise.' });
    }

    // Vérifier unicité du téléphone
    const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (existingPhone) return res.status(409).json({ error: 'Ce numero de telephone est deja associe a un compte.' });

    const hashedPassword = bcrypt.hashSync(String(password), 10);
    const generatedEmail = `${normalizedPhone.replace(/\D/g, '')}.${Date.now()}@phone.bolo237.com`;

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail || generatedEmail,
        password: hashedPassword,
        name: name ? String(name) : null,
        role: role && ['CANDIDAT', 'ENTREPRISE', 'ARTISAN'].includes(String(role)) ? String(role) : 'CANDIDAT',
        phone: normalizedPhone,
        isVerified: false,
      },
      select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, isVerified: true, isBanned: true, createdAt: true },
    });

    console.log(`✅ Nouveau user créé: ID=${user.id} Role=${user.role} Email=${user.email}`);

    await Promise.allSettled([
      sendWhatsAppModerationAlert(
        [
          '🆕 Nouveau profil en attente de vérification',
          `👤 ${user.name || '-'}`,
          `📧 ${user.email}`,
          `🏷️ ${user.role}`,
          `🔗 ID: ${user.id}`,
        ].join('\n')
      ),
      sendWelcomeEmail({ transporter, user }),
    ]);

    res.status(201).json({
      ...user,
      moderationStatus: 'PENDING',
    });
  } catch (error) {
    reportError('POST /api/users error', error, { route: '/api/users' });
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur." });
  }
});

// PUT /api/users/:id — Modifier un utilisateur (role, verification, etc.)
app.put('/api/users/:id', requireAdminSession, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const { name, role, isVerified, photoUrl } = req.body;
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isVerified: true },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const data = {};
    if (name !== undefined) data.name = String(name);
    if (role !== undefined) data.role = String(role);
    if (isVerified !== undefined) data.isVerified = Boolean(isVerified);
    if (photoUrl !== undefined) data.photoUrl = photoUrl ? String(photoUrl) : null;

    console.log(`PUT /api/users/${id} — updating:`, JSON.stringify(data));

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, photoUrl: true, isVerified: true, isBanned: true, banReason: true, bannedAt: true, createdAt: true },
    });

    console.log(`PUT /api/users/${id} — result: isVerified=${user.isVerified}`);

    // Envoyer une notification WhatsApp lors de la vérification
    if (isVerified === true && !currentUser.isVerified) {
      await Promise.allSettled([
        sendWhatsAppModerationAlert(
          `✅ Compte vérifié\nUser ID: ${user.id}\nNom: ${user.name || '-'}\nRole: ${user.role}`
        ),
        createNotification({
          userId: id,
          type: 'account_verified',
          title: 'Compte verifie',
          message: 'Votre compte a ete verifie avec succes. Vous pouvez maintenant acceder a toutes les fonctionnalites.',
          data: {},
        }),
        sendAccountVerifiedEmail({ transporter, user }),
      ]);
    }

    res.json(user);
  } catch (error) {
    reportError('PUT /api/users/:id error', error, {
      route: '/api/users/:id',
      userId: req.params.id,
    });
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// PUT /api/users/:id/ban — Bannir ou débannir un utilisateur
app.put('/api/users/:id/ban', requireAdminSession, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const { banned, reason } = req.body;
    const isBanned = Boolean(banned);

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned,
        bannedAt: isBanned ? new Date() : null,
        banReason: isBanned ? (reason ? String(reason) : 'Banni par l administrateur') : null,
      },
      select: { id: true, email: true, name: true, role: true, photoUrl: true, isVerified: true, isBanned: true, banReason: true, bannedAt: true, createdAt: true },
    });

    res.json(user);
  } catch (error) {
    console.error('PUT /api/users/:id/ban error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.status(500).json({ error: 'Erreur lors du bannissement.' });
  }
});

// DELETE /api/users/:id — Supprimer un utilisateur et ses annonces
app.delete('/api/users/:id', requireAdminSession, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    // Supprimer d'abord les jobs liés (contrainte FK)
    await prisma.job.deleteMany({ where: { authorId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ ok: true, message: 'Utilisateur et ses annonces supprimés.' });
  } catch (error) {
    console.error('DELETE /api/users/:id error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// =============================================
// ROUTES: Notifications
// =============================================

// GET /api/users/:id/notifications — Liste notifications + unreadCount
app.get('/api/users/:id/notifications', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';

    const where = unreadOnly ? { userId, isRead: false } : { userId };

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({ items, unreadCount });
  } catch (error) {
    console.error('GET /api/users/:id/notifications error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des notifications.' });
  }
});

// PATCH /api/notifications/:id/read — Marquer comme lue
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID notification invalide.' });

    const notif = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    res.json(notif);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Notification non trouvee.' });
    console.error('PATCH /api/notifications/:id/read error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour.' });
  }
});

// PATCH /api/users/:id/notifications/read-all — Marquer tout comme lu
app.patch('/api/users/:id/notifications/read-all', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ ok: true, updated: result.count });
  } catch (error) {
    console.error('PATCH /api/users/:id/notifications/read-all error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour des notifications.' });
  }
});

// GET /api/users/:id/applications — Liste des candidatures envoyées par un candidat
app.get('/api/users/:id/applications', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const notifications = await prisma.notification.findMany({
      where: { userId, type: 'application_sent' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const applications = notifications.map((n) => {
      const data = (typeof n.data === 'object' && n.data !== null) ? n.data : {};
      return {
        id: n.id,
        jobId: data.jobId || null,
        jobTitle: data.jobTitle || '',
        company: data.company || '',
        date: n.createdAt,
        statut: 'Envoyee',
      };
    });

    res.json({ applications });
  } catch (error) {
    console.error('GET /api/users/:id/applications error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des candidatures.' });
  }
});

// =============================================
// ROUTES: App Feedbacks
// =============================================

app.post('/api/feedbacks', feedbackSubmissionLimiter, async (req, res) => {
  try {
    const { userId, authorName, rating, comment } = req.body || {};

    const parsedRating = parseInt(String(rating), 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'La note doit etre comprise entre 1 et 5.' });
    }

    const normalizedComment = String(comment || '').trim();
    if (normalizedComment.length < 3) {
      return res.status(400).json({ error: 'Commentaire trop court (minimum 3 caracteres).' });
    }

    const parsedUserId = userId ? parseInt(String(userId), 10) : null;
    if (userId && isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'userId invalide.' });
    }

    const row = await prisma.appFeedback.create({
      data: {
        userId: parsedUserId || null,
        authorName: authorName ? String(authorName).trim().slice(0, 120) : null,
        rating: parsedRating,
        comment: normalizedComment,
      },
    });

    res.status(201).json(row);
  } catch (error) {
    reportError('POST /api/feedbacks error', error, { route: '/api/feedbacks' });
    res.status(500).json({ error: 'Erreur lors de la creation du retour.' });
  }
});

app.get('/api/feedbacks', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));

    const [items, avgResult] = await Promise.all([
      prisma.appFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.appFeedback.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    ]);

    res.json({
      items,
      summary: {
        averageRating: Number(avgResult._avg.rating || 0),
        count: avgResult._count._all,
      },
    });
  } catch (error) {
    console.error('GET /api/feedbacks error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des retours.' });
  }
});

// =============================================
// ROUTES: User Reviews
// =============================================

app.get('/api/users/:id/reviews', async (req, res) => {
  try {
    const reviewedId = parseInt(req.params.id, 10);
    if (isNaN(reviewedId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));

    const [items, avgResult] = await Promise.all([
      prisma.userReview.findMany({
        where: { reviewedId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          reviewer: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.userReview.aggregate({
        where: { reviewedId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    res.json({
      items,
      summary: {
        averageRating: Number(avgResult._avg.rating || 0),
        count: avgResult._count._all,
      },
    });
  } catch (error) {
    console.error('GET /api/users/:id/reviews error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des avis.' });
  }
});

app.post('/api/users/:id/reviews', reviewSubmissionLimiter, async (req, res) => {
  try {
    const reviewedId = parseInt(req.params.id, 10);
    if (isNaN(reviewedId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const { reviewerId, rating, comment } = req.body || {};
    const parsedReviewerId = parseInt(String(reviewerId), 10);
    const parsedRating = parseInt(String(rating), 10);

    if (isNaN(parsedReviewerId)) return res.status(400).json({ error: 'reviewerId invalide.' });
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'La note doit etre comprise entre 1 et 5.' });
    }
    if (parsedReviewerId === reviewedId) {
      return res.status(400).json({ error: 'Un utilisateur ne peut pas se noter lui-meme.' });
    }

    const normalizedComment = String(comment || '').trim();
    if (normalizedComment.length < 3) {
      return res.status(400).json({ error: 'Commentaire trop court (minimum 3 caracteres).' });
    }

    const [reviewerExists, reviewedExists] = await Promise.all([
      prisma.user.count({ where: { id: parsedReviewerId } }),
      prisma.user.count({ where: { id: reviewedId } }),
    ]);

    if (!reviewerExists || !reviewedExists) {
      return res.status(404).json({ error: 'Utilisateur evaluateur/evalue introuvable.' });
    }

    const row = await prisma.userReview.create({
      data: {
        reviewerId: parsedReviewerId,
        reviewedId,
        rating: parsedRating,
        comment: normalizedComment,
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(row);
  } catch (error) {
    reportError('POST /api/users/:id/reviews error', error, {
      route: '/api/users/:id/reviews',
      userId: req.params.id,
    });
    res.status(500).json({ error: 'Erreur lors de la creation de lavis.' });
  }
});

// =============================================
// ROUTES: Auth (Authentification)
// =============================================

// POST /api/auth/login — Connexion utilisateur
app.post('/api/auth/login', loginIpLimiter, loginIdentifierLimiter, async (req, res) => {
  try {
    const { email, phone, identifier, password } = req.body;
    const loginIdentifier = String(identifier || email || phone || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Identifiant (email ou telephone) et mot de passe requis.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier.toLowerCase() },
          { phone: loginIdentifier },
        ],
      },
    });
    if (!user) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    const valid = bcrypt.compareSync(String(password), user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Compte banni.', reason: user.banReason });
    }

    const token = createSessionToken(user);
    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    // Return user data without password
    const { password: _pw, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

// GET /api/auth/me — Retourner l'utilisateur de session
app.get('/api/auth/me', async (req, res) => {
  try {
    const payload = readSessionToken(req);
    if (!payload?.userId) return res.status(401).json({ error: 'Session invalide.' });

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.userId) },
      select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, isVerified: true, isBanned: true, banReason: true, createdAt: true },
    });

    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Session invalide.' });
    }

    if (user.isBanned) {
      clearSessionCookie(res);
      return res.status(403).json({ error: 'Compte banni.', reason: user.banReason });
    }

    return res.json(user);
  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    return res.status(500).json({ error: 'Erreur lors de la verification de session.' });
  }
});

// POST /api/auth/logout — Fermer la session
app.post('/api/auth/logout', (_req, res) => {
  const raw = _req.cookies?.[SESSION_COOKIE_NAME];
  if (raw) {
    try {
      const decoded = jwt.decode(raw);
      const expMs = decoded?.exp ? Number(decoded.exp) * 1000 : Date.now() + (7 * 24 * 60 * 60 * 1000);
      revokedSessionTokens.set(raw, expMs);
    } catch {
      // ignore decode errors during logout
    }
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

// =============================================
// ROUTES: Privacy / Data Rights
// =============================================

app.get('/api/privacy/export', requireUserSession, async (req, res) => {
  try {
    const user = req.sessionUser;
    const reference = buildPrivacyReference('EXP');
    const exportedAt = new Date().toISOString();

    const [profile, candidateProfile, jobs, notifications, reviewsGiven, reviewsReceived, savedJobs] = await prisma.$transaction([
      prisma.userProfile.findUnique({ where: { userId: user.id } }),
      prisma.candidateProfile.findFirst({ where: { userId: user.id } }),
      prisma.job.findMany({ where: { authorId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.userReview.findMany({ where: { reviewerId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.userReview.findMany({ where: { reviewedId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.savedJob.findMany({ where: { userId: user.id }, orderBy: { id: 'desc' } }),
    ]);

    const verificationSubmissions = user.phone
      ? await prisma.verificationSubmission.findMany({ where: { phone: user.phone }, orderBy: { submittedAt: 'desc' } })
      : [];

    await createPrivacyRequestLog({
      reference,
      kind: 'EXPORT',
      status: 'COMPLETED',
      user,
      delivery: 'download',
      req,
      processedAt: new Date(exportedAt),
      processedBy: 'system',
      payload: {
        jobsCount: jobs.length,
        notificationsCount: notifications.length,
        reviewsGivenCount: reviewsGiven.length,
        reviewsReceivedCount: reviewsReceived.length,
        savedJobsCount: savedJobs.length,
        verificationSubmissionsCount: verificationSubmissions.length,
      },
    });

    return res.json({
      reference,
      exportedAt,
      user,
      profile,
      candidateProfile,
      jobs,
      notifications,
      reviewsGiven,
      reviewsReceived,
      savedJobs,
      verificationSubmissions,
    });
  } catch (error) {
    console.error('GET /api/privacy/export error:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'export des donnees personnelles.' });
  }
});

app.post('/api/privacy/delete-request', requireUserSession, privacyRequestLimiter, async (req, res) => {
  try {
    const user = req.sessionUser;
    const reason = String(req.body?.reason || '').trim().slice(0, 1000);
    const reference = buildPrivacyReference('DEL');
    const requestedAt = new Date().toISOString();
    const lines = [
      'Nouvelle demande de suppression de compte Bolo237',
      `Reference: ${reference}`,
      `User ID: ${user.id}`,
      `Email: ${user.email}`,
      `Phone: ${user.phone || 'non renseigne'}`,
      `Role: ${user.role}`,
      `Requested at: ${requestedAt}`,
      `Reason: ${reason || 'Aucun motif fourni.'}`,
    ];

    await createPrivacyRequestLog({
      reference,
      kind: 'DELETE',
      status: 'PENDING',
      user,
      reason,
      delivery: 'pending',
      req,
      payload: {
        requestedAt,
        channel: 'self-service',
      },
    });

    const delivery = await notifyPrivacyTeam({
      subject: `[Bolo237] Demande de suppression ${reference}`,
      text: lines.join('\n'),
      replyTo: user.email,
    });

    await prisma.privacyRequest.update({
      where: { reference },
      data: { delivery },
    });

    await createAdminNotifications({
      type: 'privacy_delete_request',
      title: 'Nouvelle demande de suppression',
      message: `${user.email} a soumis la demande ${reference}.`,
      data: {
        area: 'privacy',
        reference,
        kind: 'DELETE',
        status: 'PENDING',
        requesterEmail: user.email,
        requesterRole: user.role,
        delivery,
      },
      emailAlert: true,
      whatsappAlert: true,
      replyTo: user.email,
    });

    return res.status(202).json({
      ok: true,
      reference,
      delivery,
      message: 'Votre demande a ete enregistree et sera traitee apres verification d\'identite et controle des obligations legales.',
    });
  } catch (error) {
    console.error('POST /api/privacy/delete-request error:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la demande de suppression.' });
  }
});

// =============================================
// ROUTES: Reports (Signalements)
// =============================================

// GET /api/reports/summary — Synthese publique d'un contenu signale
app.get('/api/reports/summary', async (req, res) => {
  try {
    const targetType = normalizeReportTargetType(req.query.targetType);
    const targetId = parsePositiveInt(req.query.targetId);

    if (!targetType || !targetId) {
      return res.status(400).json({ error: 'Parametres invalides: targetType, targetId.' });
    }

    const summary = await buildReportSummary(targetType, targetId);
    return res.json(summary);
  } catch (error) {
    console.error('GET /api/reports/summary error:', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture de la synthese des signalements.' });
  }
});

// GET /api/reports — Liste des signalements
app.get('/api/reports', requireAdminSession, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = String(status);

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(reports);
  } catch (error) {
    console.error('GET /api/reports error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des signalements.' });
  }
});

// POST /api/reports — Créer un signalement
app.post('/api/reports', reportSubmissionLimiter, async (req, res) => {
  try {
    const reason = normalizeReportReason(req.body?.reason);
    const targetType = normalizeReportTargetType(req.body?.targetType);
    const targetId = parsePositiveInt(req.body?.targetId);

    if (!reason || !targetType || !targetId) {
      return res.status(400).json({ error: 'Champs obligatoires: reason, targetType, targetId.' });
    }

    const targetExists = await reportTargetExists(targetType, targetId);
    if (!targetExists) {
      return res.status(404).json({ error: 'Cible introuvable pour ce signalement.' });
    }

    const now = Date.now();
    cleanupRecentReportSubmissions(now);
    const fingerprint = getRequestFingerprint(req);
    const dedupeKey = `${fingerprint}:${targetType}:${targetId}:${reason}`;
    const expiresAt = recentReportSubmissions.get(dedupeKey);

    if (expiresAt && expiresAt > now) {
      return res.status(409).json({ error: 'Un signalement identique a deja ete enregistre recemment depuis cet appareil.' });
    }

    recentReportSubmissions.set(dedupeKey, now + REPORT_DEDUPE_WINDOW_MS);

    const report = await prisma.report.create({
      data: {
        reason,
        targetType,
        targetId,
        status: 'OPEN',
      },
    });

    const summary = await buildReportSummary(targetType, targetId);

    if (summary.reviewThresholdReached && summary.openReports === REPORT_REVIEW_THRESHOLD) {
      await sendWhatsAppModerationAlert(
        `🚩 Signalements eleves\nCible: ${targetType} #${targetId}\nSignalements ouverts: ${summary.openReports}\nAction recommandee: verification prioritaire dans l'admin Bolo237.`
      );
    }

    res.status(201).json({ report, summary });
  } catch (error) {
    console.error('POST /api/reports error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du signalement.' });
  }
});

// PUT /api/reports/:id — Modifier le statut d'un signalement
app.put('/api/reports/:id', requireAdminSession, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Statut requis.' });

    const report = await prisma.report.update({
      where: { id },
      data: { status: String(status) },
    });

    res.json(report);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Signalement non trouvé.' });
    console.error('PUT /api/reports/:id error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// =============================================
// ROUTES: Admin
// =============================================

// GET /api/admin/stats — Statistiques globales (enrichi)
app.get('/api/admin/stats', requireAdminSession, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [usersCount, pendingJobsCount, approvedJobsCount, reportsCount, todaySignups, totalReviews, enterprisePending] = await Promise.all([
      prisma.user.count(),
      prisma.job.count({ where: { status: 'PENDING' } }),
      prisma.job.count({ where: { status: { in: ['APPROVED', 'ACTIVE'] } } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.userReview.count(),
      prisma.user.count({ where: { role: 'ENTREPRISE', isVerified: false } }),
    ]);

    res.json({
      users: usersCount,
      pendingJobs: pendingJobsCount,
      approvedJobs: approvedJobsCount,
      reports: reportsCount,
      todaySignups,
      totalReviews,
      enterprisePending,
    });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des statistiques.' });
  }
});

// GET /api/admin/privacy-requests — Journal des demandes de confidentialite
app.get('/api/admin/privacy-requests', requireAdminSession, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;
    const rawStatus = req.query.status ? String(req.query.status).trim() : '';
    const rawKind = req.query.kind ? String(req.query.kind).trim() : '';
    const rawQuery = String(req.query.query || req.query.q || '').trim().slice(0, 160);
    const startDate = parseDateOnlyFilter(req.query.startDate);
    const endDate = parseDateOnlyFilter(req.query.endDate);
    const status = rawStatus ? normalizePrivacyRequestStatus(rawStatus) : null;
    const kind = rawKind ? normalizePrivacyRequestKind(rawKind) : null;

    if (rawStatus && !status) {
      return res.status(400).json({ error: 'Statut de demande de confidentialite invalide.' });
    }

    if (rawKind && !kind) {
      return res.status(400).json({ error: 'Type de demande de confidentialite invalide.' });
    }

    if (req.query.startDate && startDate === null) {
      return res.status(400).json({ error: 'Date de debut invalide. Format attendu: YYYY-MM-DD.' });
    }

    if (req.query.endDate && endDate === null) {
      return res.status(400).json({ error: 'Date de fin invalide. Format attendu: YYYY-MM-DD.' });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ error: 'La date de debut doit etre anterieure ou egale a la date de fin.' });
    }

    const where = {};
    if (status) where.status = status;
    if (kind) where.kind = kind;
    Object.assign(where, buildDateRangeFilter('requestedAt', startDate, endDate));

    if (rawQuery) {
      where.OR = [
        { reference: { contains: rawQuery, mode: 'insensitive' } },
        { requesterEmail: { contains: rawQuery, mode: 'insensitive' } },
        { requesterName: { contains: rawQuery, mode: 'insensitive' } },
        { requesterPhone: { contains: rawQuery, mode: 'insensitive' } },
        { requesterRole: { contains: rawQuery, mode: 'insensitive' } },
        { reason: { contains: rawQuery, mode: 'insensitive' } },
        { notes: { contains: rawQuery, mode: 'insensitive' } },
        { processedBy: { contains: rawQuery, mode: 'insensitive' } },
      ];
    }

    const [items, filteredTotal, total, pending, inReview, completed, rejected, exportsCount, deletionsCount] = await Promise.all([
      prisma.privacyRequest.findMany({
        where,
        orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.privacyRequest.count({ where }),
      prisma.privacyRequest.count(),
      prisma.privacyRequest.count({ where: { status: 'PENDING' } }),
      prisma.privacyRequest.count({ where: { status: 'IN_REVIEW' } }),
      prisma.privacyRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.privacyRequest.count({ where: { status: 'REJECTED' } }),
      prisma.privacyRequest.count({ where: { kind: 'EXPORT' } }),
      prisma.privacyRequest.count({ where: { kind: 'DELETE' } }),
    ]);

    res.json({
      items,
      pagination: { page, limit, total: filteredTotal, totalPages: Math.ceil(filteredTotal / limit) || 1 },
      summary: {
        total,
        pending,
        inReview,
        completed,
        rejected,
        exports: exportsCount,
        deletions: deletionsCount,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/privacy-requests error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du journal de confidentialite.' });
  }
});

// PATCH /api/admin/privacy-requests/:reference — Suivi manuel d'une demande de confidentialite
app.patch('/api/admin/privacy-requests/:reference', requireAdminSession, async (req, res) => {
  try {
    const reference = String(req.params.reference || '').trim().toUpperCase();
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const statusProvided = Object.prototype.hasOwnProperty.call(body, 'status');
    const notesProvided = Object.prototype.hasOwnProperty.call(body, 'notes');
    const status = statusProvided ? normalizePrivacyRequestStatus(body.status) : null;
    const notes = normalizePrivacyNotes(body.notes);

    if (!reference) {
      return res.status(400).json({ error: 'Reference de demande invalide.' });
    }

    if (statusProvided && !status) {
      return res.status(400).json({ error: 'Statut de confidentialite invalide.' });
    }

    if (!statusProvided && !notesProvided) {
      return res.status(400).json({ error: 'Aucune mise a jour fournie.' });
    }

    const [current, adminUser] = await Promise.all([
      prisma.privacyRequest.findUnique({
        where: { reference },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.user.findUnique({
        where: { id: req.adminUserId },
        select: { id: true, name: true, email: true },
      }),
    ]);

    if (!current) {
      return res.status(404).json({ error: 'Demande de confidentialite introuvable.' });
    }

    const nextStatus = statusProvided ? status : current.status;
    const adminLabel = adminUser?.email || adminUser?.name || `admin#${req.adminUserId}`;
    const updateData = {};

    if (statusProvided) {
      updateData.status = nextStatus;
    }

    if (notesProvided) {
      updateData.notes = notes || null;
    }

    if (statusProvided && nextStatus === 'PENDING') {
      updateData.processedAt = null;
      updateData.processedBy = null;
    } else if ((statusProvided && nextStatus !== 'PENDING') || (notesProvided && current.status !== 'PENDING')) {
      updateData.processedAt = new Date();
      updateData.processedBy = adminLabel;
    }

    const updated = await prisma.privacyRequest.update({
      where: { reference },
      data: updateData,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

    if (current.kind === 'DELETE' && statusProvided && nextStatus !== current.status) {
      await createAdminNotifications({
        type: 'privacy_delete_status',
        title: 'Statut de suppression mis a jour',
        message: `${reference} est passe de ${current.status} a ${nextStatus} par ${adminLabel}.`,
        data: {
          area: 'privacy',
          reference,
          kind: current.kind,
          previousStatus: current.status,
          status: nextStatus,
          requesterEmail: current.requesterEmail,
          processedBy: adminLabel,
        },
        excludeUserIds: req.adminUserId ? [req.adminUserId] : [],
        emailAlert: true,
        whatsappAlert: true,
        replyTo: current.requesterEmail,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/admin/privacy-requests/:reference error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de la demande de confidentialite.' });
  }
});

// GET /api/admin/reviews — All reviews with alert for low-rated users
app.get('/api/admin/reviews', requireAdminSession, async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(String(req.query.limit || '50'), 10) || 50);
    const reviews = await prisma.userReview.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reviewed: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Compute average per reviewed user to detect low-rated profiles
    const userRatings = {};
    reviews.forEach((r) => {
      const uid = r.reviewedId;
      if (!userRatings[uid]) userRatings[uid] = { total: 0, count: 0, name: r.reviewed?.name || '', role: r.reviewed?.role || '' };
      userRatings[uid].total += r.rating;
      userRatings[uid].count += 1;
    });

    const alerts = Object.entries(userRatings)
      .map(([uid, data]) => ({
        userId: parseInt(uid, 10),
        name: data.name,
        role: data.role,
        averageRating: Math.round((data.total / data.count) * 10) / 10,
        reviewCount: data.count,
      }))
      .filter((u) => u.averageRating <= 2.5 && u.reviewCount >= 2)
      .sort((a, b) => a.averageRating - b.averageRating);

    res.json({ reviews, alerts });
  } catch (error) {
    console.error('GET /api/admin/reviews error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des avis.' });
  }
});

// GET /api/admin/users — User list with recent signups
app.get('/api/admin/users', requireAdminSession, async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(String(req.query.limit || '50'), 10) || 50);
    const role = req.query.role ? String(req.query.role).toUpperCase() : undefined;
    const where = {};
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        isVerified: true, isBanned: true, createdAt: true,
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// GET /api/admin/trends?days=7 — Tendances des inscriptions et publications
app.get('/api/admin/trends', requireAdminSession, async (req, res) => {
  try {
    const daysRaw = parseInt(String(req.query.days || '7'), 10);
    const days = [7, 30].includes(daysRaw) ? daysRaw : 7;
    const locale = String(req.query.locale || 'fr').toLowerCase() === 'en' ? 'en-US' : 'fr-FR';

    const buckets = buildDateBuckets(days);
    const startDate = buckets[0];

    const [users, jobs] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      prisma.job.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
    ]);

    const userCounts = new Map();
    const jobCounts = new Map();

    users.forEach((u) => {
      const key = toDayKey(u.createdAt);
      userCounts.set(key, (userCounts.get(key) || 0) + 1);
    });

    jobs.forEach((j) => {
      const key = toDayKey(j.createdAt);
      jobCounts.set(key, (jobCounts.get(key) || 0) + 1);
    });

    const points = buckets.map((d) => {
      const key = toDayKey(d);
      return {
        dayKey: key,
        label: formatShortDate(d, locale),
        users: userCounts.get(key) || 0,
        jobs: jobCounts.get(key) || 0,
      };
    });

    res.json({ days, points });
  } catch (error) {
    console.error('GET /api/admin/trends error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des tendances.' });
  }
});

// GET /api/admin/banned-users — Liste des utilisateurs bannis
app.get('/api/admin/banned-users', requireAdminSession, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const search = req.query.search ? String(req.query.search).trim() : '';
    const skip = (page - 1) * limit;

    const where = { isBanned: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { bannedAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, name: true, email: true, role: true, isBanned: true, banReason: true, bannedAt: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('GET /api/admin/banned-users error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des utilisateurs bannis.' });
  }
});

// POST /api/admin/notifications/broadcast — Envoyer une notification a tous ou par role
app.post('/api/admin/notifications/broadcast', requireAdminSession, async (req, res) => {
  try {
    const { title, message, type, targetRole } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title et message requis.' });

    const roleFilter = targetRole && targetRole !== 'ALL' ? String(targetRole).toUpperCase() : undefined;
    const userWhere = roleFilter ? { role: roleFilter } : {};

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    if (users.length === 0) return res.json({ sent: 0 });

    const data = users.map((u) => ({
      userId: u.id,
      type: type || 'broadcast',
      title: String(title),
      message: String(message),
    }));

    const result = await prisma.notification.createMany({ data });
    res.json({ sent: result.count });
  } catch (error) {
    console.error('POST /api/admin/notifications/broadcast error:', error);
    res.status(500).json({ error: 'Erreur lors de l envoi des notifications.' });
  }
});

// GET /api/admin/notifications — Toutes les notifications (admin)
app.get('/api/admin/notifications', requireAdminSession, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;
    const rawQuery = String(req.query.query || req.query.q || '').trim().slice(0, 160);
    const startDate = parseDateOnlyFilter(req.query.startDate);
    const endDate = parseDateOnlyFilter(req.query.endDate);

    if (req.query.startDate && startDate === null) {
      return res.status(400).json({ error: 'Date de debut invalide. Format attendu: YYYY-MM-DD.' });
    }

    if (req.query.endDate && endDate === null) {
      return res.status(400).json({ error: 'Date de fin invalide. Format attendu: YYYY-MM-DD.' });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ error: 'La date de debut doit etre anterieure ou egale a la date de fin.' });
    }

    const where = {
      ...buildDateRangeFilter('createdAt', startDate, endDate),
    };

    if (rawQuery) {
      where.OR = [
        { title: { contains: rawQuery, mode: 'insensitive' } },
        { message: { contains: rawQuery, mode: 'insensitive' } },
        { type: { contains: rawQuery, mode: 'insensitive' } },
        { user: { is: { name: { contains: rawQuery, mode: 'insensitive' } } } },
        { user: { is: { email: { contains: rawQuery, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('GET /api/admin/notifications error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des notifications.' });
  }
});

// GET /api/admin/me/notifications — Notifications internes du compte admin connecte
app.get('/api/admin/me/notifications', requireAdminSession, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const skip = (page - 1) * limit;
    const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';
    const rawQuery = String(req.query.query || req.query.q || '').trim().slice(0, 160);
    const startDate = parseDateOnlyFilter(req.query.startDate);
    const endDate = parseDateOnlyFilter(req.query.endDate);

    if (req.query.startDate && startDate === null) {
      return res.status(400).json({ error: 'Date de debut invalide. Format attendu: YYYY-MM-DD.' });
    }

    if (req.query.endDate && endDate === null) {
      return res.status(400).json({ error: 'Date de fin invalide. Format attendu: YYYY-MM-DD.' });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ error: 'La date de debut doit etre anterieure ou egale a la date de fin.' });
    }

    const where = unreadOnly
      ? { userId: req.adminUserId, isRead: false }
      : { userId: req.adminUserId };

    Object.assign(where, buildDateRangeFilter('createdAt', startDate, endDate));

    if (rawQuery) {
      where.OR = [
        { title: { contains: rawQuery, mode: 'insensitive' } },
        { message: { contains: rawQuery, mode: 'insensitive' } },
        { type: { contains: rawQuery, mode: 'insensitive' } },
      ];
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.adminUserId, isRead: false } }),
    ]);

    res.json({
      items,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error('GET /api/admin/me/notifications error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des notifications admin.' });
  }
});

// PATCH /api/admin/me/notifications/:id/read — Marquer une notification admin comme lue
app.patch('/api/admin/me/notifications/:id/read', requireAdminSession, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID notification invalide.' });
    }

    const notif = await prisma.notification.updateMany({
      where: { id, userId: req.adminUserId },
      data: { isRead: true, readAt: new Date() },
    });

    if (notif.count === 0) {
      return res.status(404).json({ error: 'Notification admin non trouvee.' });
    }

    const updated = await prisma.notification.findUnique({ where: { id } });
    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/admin/me/notifications/:id/read error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de la notification admin.' });
  }
});

// PATCH /api/admin/me/notifications/read-all — Marquer toutes les notifications admin comme lues
app.patch('/api/admin/me/notifications/read-all', requireAdminSession, async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.adminUserId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ ok: true, updated: result.count });
  } catch (error) {
    console.error('PATCH /api/admin/me/notifications/read-all error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour des notifications admin.' });
  }
});

// GET /api/admin/search?q=term — Recherche globale admin
app.get('/api/admin/search', requireAdminSession, async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';
    if (!q) return res.json({ users: [], jobs: [] });

    const numericQuery = q.replace(/^#/, '');
    const exactSearchId = /^\d+$/.test(numericQuery) ? parseInt(numericQuery, 10) : null;

    const userSearchConditions = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];

    const jobSearchConditions = [
      { title: { contains: q, mode: 'insensitive' } },
      { company: { contains: q, mode: 'insensitive' } },
    ];

    if (exactSearchId !== null) {
      userSearchConditions.unshift({ id: exactSearchId });
      jobSearchConditions.unshift({ id: exactSearchId });
    }

    const [users, jobs] = await Promise.all([
      prisma.user.findMany({
        where: { OR: userSearchConditions },
        take: 5,
        select: { id: true, name: true, email: true, phone: true, role: true },
      }),
      prisma.job.findMany({
        where: { OR: jobSearchConditions },
        take: 5,
        select: { id: true, title: true, company: true, status: true },
      }),
    ]);

    res.json({ users, jobs });
  } catch (error) {
    console.error('GET /api/admin/search error:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche.' });
  }
});

// GET /api/admin/settings — Parametres de la plateforme
app.get('/api/admin/settings', requireAdminSession, (_req, res) => {
  res.json(platformSettings);
});

// PUT /api/admin/settings — Mettre a jour les parametres
app.put('/api/admin/settings', requireAdminSession, (req, res) => {
  try {
    platformSettings = normalizePlatformSettings({
      ...platformSettings,
      ...(req.body && typeof req.body === 'object' ? req.body : {}),
      moderationRules: {
        ...platformSettings.moderationRules,
        ...(req.body?.moderationRules && typeof req.body.moderationRules === 'object' ? req.body.moderationRules : {}),
      },
      notificationPreferences: {
        ...platformSettings.notificationPreferences,
        ...(req.body?.notificationPreferences && typeof req.body.notificationPreferences === 'object' ? req.body.notificationPreferences : {}),
      },
    });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(platformSettings, null, 2), 'utf8');
    res.json(platformSettings);
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour des parametres.' });
  }
});

// GET /api/admin/activity-log — Journal d activite recent
app.get('/api/admin/activity-log', requireAdminSession, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));

    const [recentUsers, recentJobs, recentReports, recentBans, recentPrivacyRequests] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, name: true, role: true, createdAt: true },
      }),
      prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, title: true, company: true, createdAt: true },
      }),
      prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, reason: true, createdAt: true },
      }),
      prisma.user.findMany({
        where: { isBanned: true, bannedAt: { not: null } },
        orderBy: { bannedAt: 'desc' },
        take: limit,
        select: { id: true, name: true, bannedAt: true },
      }),
      prisma.privacyRequest.findMany({
        orderBy: { requestedAt: 'desc' },
        take: limit,
        select: { reference: true, kind: true, status: true, requestedAt: true, requesterEmail: true },
      }),
    ]);

    const events = [];

    recentUsers.forEach((u) => {
      events.push({
        type: 'signup',
        description: `Nouvel utilisateur: ${u.name} (${u.role})`,
        timestamp: u.createdAt,
        meta: { userId: u.id, name: u.name, role: u.role },
      });
    });

    recentJobs.forEach((j) => {
      events.push({
        type: 'job_posted',
        description: `Nouvelle offre: ${j.title} par ${j.company}`,
        timestamp: j.createdAt,
        meta: { jobId: j.id, title: j.title, company: j.company },
      });
    });

    recentReports.forEach((r) => {
      events.push({
        type: 'report',
        description: `Signalement #${r.id}: ${r.reason}`,
        timestamp: r.createdAt,
        meta: { reportId: r.id, reason: r.reason },
      });
    });

    recentBans.forEach((b) => {
      events.push({
        type: 'ban',
        description: `Utilisateur banni: ${b.name}`,
        timestamp: b.bannedAt,
        meta: { userId: b.id, name: b.name },
      });
    });

    recentPrivacyRequests.forEach((request) => {
      const actionLabel = request.kind === 'EXPORT' ? 'Export de donnees' : 'Demande de suppression';
      events.push({
        type: 'privacy_request',
        description: `${actionLabel}: ${request.reference} (${request.status})`,
        timestamp: request.requestedAt,
        meta: {
          reference: request.reference,
          kind: request.kind,
          status: request.status,
          requesterEmail: request.requesterEmail,
        },
      });
    });

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ events: events.slice(0, limit) });
  } catch (error) {
    console.error('GET /api/admin/activity-log error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du journal d activite.' });
  }
});

// =============================================
// ROUTES: File Upload (Cloudinary)
// =============================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME.has(String(file.mimetype || '').toLowerCase())) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  },
});

app.post('/api/upload', uploadIpLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!ALLOWED_UPLOAD_MIME.has(String(req.file.mimetype || '').toLowerCase())) {
      return res.status(400).json({ error: 'Type de fichier non autorise. Formats acceptes: jpeg, png, webp, pdf, doc, docx.' });
    }

    const safeFolder = String(req.query.folder || 'general').replace(/[^a-zA-Z0-9/_-]/g, '') || 'general';

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const folder = `bolo237/${safeFolder}`;

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'auto' },
          (error, uploadResult) => error ? reject(error) : resolve(uploadResult)
        );
        stream.end(req.file.buffer);
      });

      return res.json({ url: result.secure_url, publicId: result.public_id });
    }

    const extension = path.extname(req.file.originalname || '') || '';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
    const targetDir = path.join(uploadsRoot, safeFolder);
    fs.mkdirSync(targetDir, { recursive: true });

    const fullPath = path.join(targetDir, fileName);
    fs.writeFileSync(fullPath, req.file.buffer);

    const relativePath = `${safeFolder}/${fileName}`.replace(/\\/g, '/');
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({ url: `${baseUrl}/uploads/${relativePath}`, publicId: relativePath });
  } catch (error) {
    reportError('Upload error', error, {
      route: '/api/upload',
      folder: req.query?.folder,
    });
    if (error?.message === 'Invalid file type') {
      return res.status(400).json({ error: 'Type de fichier non autorise. Formats acceptes: jpeg, png, webp, pdf, doc, docx.' });
    }
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux. Taille maximale: 10 Mo.' });
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

// =============================================
// ROUTES: OTP (Verification telephone)
// =============================================

// Stockage en memoire des codes OTP (en prod : Redis ou DB)
const otpStore = new Map(); // phone -> { code, expires }

const otpIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes OTP depuis cette IP. Reessayez dans 15 minutes.' },
});

const otpPhoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de demandes OTP pour ce numero. Reessayez dans 15 minutes.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: getPositiveIntegerEnv('OTP_VERIFY_15M_LIMIT', 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de tentatives de verification OTP. Reessayez dans 15 minutes.' },
});

// Route pour ENVOYER le code SMS
app.post('/api/otp/send', otpIpLimiter, otpPhoneLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Numéro de téléphone requis" });

  // 1. Générer un vrai code à 6 chiffres
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Sauvegarder en mémoire (expire dans 5 minutes)
  otpStore.set(phone, { code: otp, expires: Date.now() + 5 * 60000 });

  try {
    // 3. Envoyer le vrai SMS via Twilio
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        body: `Bienvenue sur Bolo237 ! Votre code de vérification est : ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`✅ SMS envoyé avec succès à ${phone}`);
    } else {
      console.warn(`⚠️ Twilio non configuré pour les SMS. Code généré en local : ${otp}`);
    }
    
    res.json({ success: true, message: "Code envoyé par SMS" });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi du SMS Twilio:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi du SMS. Veuillez réessayer." });
  }
});

// Route pour VÉRIFIER le code SMS
app.post('/api/otp/verify', otpVerifyLimiter, async (req, res) => {
  const { phone, code } = req.body;

  const record = otpStore.get(phone);
  if (!record) return res.status(400).json({ error: "Aucun code demandé pour ce numéro" });
  if (Date.now() > record.expires) {
    otpStore.delete(phone);
    return res.status(400).json({ error: "Le code a expiré (5 minutes max)" });
  }
  if (record.code !== code) {
    return res.status(400).json({ error: "Code incorrect" });
  }

  // Si c'est bon, on supprime le code pour la sécurité
  otpStore.delete(phone);
  res.json({ success: true, verified: true, message: "Téléphone vérifié avec succès" });
});

// =============================================
// ROUTES: RESET MOT DE PASSE (via OTP telephone)
// =============================================

// Etape 1: Demander un reset — envoie un OTP au telephone associé
app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Numéro de téléphone requis." });

    // Vérifier que le téléphone existe dans la base
    const user = await prisma.user.findUnique({ where: { phone: String(phone) } });
    if (!user) return res.status(404).json({ error: "Aucun compte associé à ce numéro." });

    // Générer et stocker un OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { code: otp, expires: Date.now() + 5 * 60000 });

    const deliveryTasks = [];

    // Envoyer par SMS si Twilio configuré
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      deliveryTasks.push(
        twilioClient.messages.create({
          body: `Bolo237 — Votre code de réinitialisation : ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        })
      );
    }

    deliveryTasks.push(sendPasswordResetCodeEmail({ transporter, user, code: otp }));

    await Promise.allSettled(deliveryTasks);

    // OTP sent (not logged for security)
    res.json({ success: true, message: "Code envoye. Verifiez votre SMS ou votre email." });
  } catch (error) {
    reportError('forgot-password error', error, { route: '/api/auth/forgot-password' });
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Etape 2: Vérifier OTP + définir nouveau mot de passe
app.post('/api/auth/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) {
      return res.status(400).json({ error: "Téléphone, code et nouveau mot de passe requis." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
    }

    const record = otpStore.get(phone);

    if (!record) return res.status(400).json({ error: "Aucun code demandé pour ce numéro." });
    if (Date.now() > record.expires) {
      otpStore.delete(phone);
      return res.status(400).json({ error: "Le code a expiré." });
    }
    if (record.code !== code) {
      return res.status(400).json({ error: "Code incorrect." });
    }

    otpStore.delete(phone);

    // Trouver l'utilisateur et mettre à jour le mot de passe
    const user = await prisma.user.findUnique({ where: { phone: String(phone) } });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    const hashedPassword = bcrypt.hashSync(String(newPassword), 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    await sendPasswordResetConfirmationEmail({ transporter, user });

    console.log(`✅ Mot de passe réinitialisé pour user ${user.id} (${phone})`);
    res.json({ success: true, message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    reportError('reset-password error', error, { route: '/api/auth/reset-password' });
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// =============================================
// ROUTES: Boite de Reception (Hostinger IMAP + legacy webhook)
// =============================================

app.post('/api/admin/emails', requireAdminSession, async (req, res) => {
  try {
    const { senderEmail, senderName, subject, body } = req.body;

    // 1. Vérification basique
    if (!senderEmail || !subject) {
      return res.status(400).json({ error: 'Email expéditeur et sujet requis.' });
    }

    // 2. Sauvegarde dans la base de données (Neon)
    const ticket = await prisma.supportTicket.create({
      data: {
        senderEmail: String(senderEmail),
        senderName: senderName ? String(senderName) : null,
        subject: String(subject),
        body: String(body),
        status: 'UNREAD'
      }
    });

    // 3. Le petit bonus CEO : Alerte WhatsApp immédiate !
    await sendWhatsAppModerationAlert(
      `📧 Nouvel Email Pro !\nDe: ${senderEmail}\nSujet: ${subject}`
    ).catch((err) => console.error("Erreur Twilio WhatsApp :", err.message));

    // 4. On répond à n8n que tout s'est bien passé
    res.status(201).json({ success: true, ticket });
    
  } catch (error) {
    console.error('POST /api/admin/emails error:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de l\'email.' });
  }
});

app.get('/api/admin/emails', requireAdminSession, async (req, res) => {
  try {
    const force = req.query.force === '1' || req.query.force === 'true';
    const inbox = await getAdminInbox(prisma, {
      force,
      limit: req.query.limit,
      scope: req.query.view,
    });

    res.status(200).json(inbox);
  } catch (error) {
    console.error('GET /api/admin/emails error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des emails.' });
  }
});

app.get('/api/admin/emails/summary', requireAdminSession, async (req, res) => {
  try {
    const force = req.query.force === '1' || req.query.force === 'true';
    const summary = await getAdminInboxSummary(prisma, {
      force,
      scope: req.query.view,
    });
    res.status(200).json(summary);
  } catch (error) {
    console.error('GET /api/admin/emails/summary error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du résumé des emails.' });
  }
});

app.post('/api/admin/emails/:ticketId/read', requireAdminSession, async (req, res) => {
  try {
    const item = await markAdminInboxTicketRead(prisma, req.params.ticketId);
    res.status(200).json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de mettre le message à jour.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|requis/i.test(message)
        ? 400
        : 500;

    console.error('POST /api/admin/emails/:ticketId/read error:', error);
    res.status(statusCode).json({ error: message });
  }
});

app.post('/api/admin/emails/:ticketId/archive', requireAdminSession, async (req, res) => {
  try {
    const result = await archiveAdminInboxTicket(prisma, req.params.ticketId);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible d\'archiver le message.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|indisponible/i.test(message)
        ? 400
        : 500;

    console.error('POST /api/admin/emails/:ticketId/archive error:', error);
    res.status(statusCode).json({ error: message });
  }
});

app.post('/api/admin/emails/:ticketId/trash', requireAdminSession, async (req, res) => {
  try {
    const result = await trashAdminInboxTicket(prisma, req.params.ticketId);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de supprimer le message.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|indisponible/i.test(message)
        ? 400
        : 500;

    console.error('POST /api/admin/emails/:ticketId/trash error:', error);
    res.status(statusCode).json({ error: message });
  }
});

app.get('/api/admin/emails/:ticketId/attachments/:part/download', requireAdminSession, async (req, res) => {
  try {
    const result = await downloadAdminInboxAttachment(prisma, req.params.ticketId, req.params.part);
    const filename = String(result.meta.filename || result.attachment.filename || 'attachment.bin').replace(/[\r\n"]/g, '_');
    const contentType = String(result.meta.contentType || result.attachment.contentType || 'application/octet-stream');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(result.content.length));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.status(200).send(result.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de telecharger la piece jointe.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : error?.code === 'TOO_LARGE'
        ? 413
        : /invalide|indisponible/i.test(message)
          ? 400
          : 500;

    console.error('GET /api/admin/emails/:ticketId/attachments/:part/download error:', error);
    res.status(statusCode).json({ error: message });
  }
});

// ROUTE: Repondre a un ticket
app.post('/api/admin/emails/reply', requireAdminSession, async (req, res) => {
  try {
    const result = await replyToAdminInboxTicket(prisma, transporter, req.body);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible d\'envoyer la reponse.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|requis/i.test(message)
        ? 400
        : 500;

    console.error('Erreur envoi reponse:', error);
    res.status(statusCode).json({ error: message });
  }
});

// --- Page d'accueil API ---
app.get('/', (_req, res) => {
  res.json({
    name: 'Bolo237 API',
    version: '1.0.0',
    status: 'online',
    documentation: {
      health: 'GET /api/health',
      jobs: 'GET /api/jobs',
      users: 'GET /api/users',
      reports: 'GET /api/reports',
      admin: 'GET /api/admin/stats',
      auth_login: 'POST /api/auth/login',
      auth_me: 'GET /api/auth/me',
      auth_logout: 'POST /api/auth/logout',
      otp_send: 'POST /api/otp/send',
      otp_verify: 'POST /api/otp/verify',
    },
    timestamp: new Date().toISOString(),
  });
});

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

Sentry.setupExpressErrorHandler(app);

// Démarrage des tâches automatisées
startJobArchiver(prisma);

// --- Start server ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`Backend Bolo237 en ligne !`);
  console.log(`Ecoute sur le port : ${PORT}`);
  console.log(`========================================\n`);
});

// --- Graceful shutdown ---
const shutdown = async (signal) => {
  console.log(`\n${signal} recu. Arret en cours...`);
  server.close(async () => {
    await prisma.$disconnect();
    await pool.end();
    console.log('Connexions fermees. Au revoir.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
