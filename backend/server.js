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

const SENSITIVE_FIELDS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'otp',
  'code',
  'secret',
  'authorization',
  'apiKey',
  'creditCard',
  'cardNumber',
  'cvv',
]);

function scrubObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrubObject);
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key)) {
      out[key] = '[Filtered]';
    } else if (value && typeof value === 'object') {
      out[key] = scrubObject(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

Sentry.init({
  enabled: sentryEnabled,
  dsn: sentryDsn || undefined,
  sendDefaultPii: false,
  includeLocalVariables: false,
  environment: String(process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development').trim() || 'development',
  release: String(process.env.SENTRY_RELEASE || '').trim() || undefined,
  tracesSampleRate: getSampleRateFromEnv(
    'SENTRY_TRACES_SAMPLE_RATE',
    process.env.NODE_ENV === 'production' ? 0.1 : 1,
  ),
  profilesSampleRate: getSampleRateFromEnv('SENTRY_PROFILES_SAMPLE_RATE', 0),
  enableLogs: true,
  beforeSend(event) {
    try {
      if (event.request) {
        if (event.request.cookies) event.request.cookies = '[Filtered]';
        if (event.request.headers) {
          const h = event.request.headers;
          if (h.cookie) h.cookie = '[Filtered]';
          if (h.authorization) h.authorization = '[Filtered]';
          if (h['x-api-key']) h['x-api-key'] = '[Filtered]';
        }
        if (event.request.data) event.request.data = scrubObject(event.request.data);
        if (event.request.query_string && typeof event.request.query_string === 'string') {
          event.request.query_string = event.request.query_string.replace(/(token|otp|code|password)=[^&]*/gi, '$1=[Filtered]');
        }
      }
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      if (event.extra) event.extra = scrubObject(event.extra);
      if (event.contexts) event.contexts = scrubObject(event.contexts);
    } catch (err) {
      // never break Sentry on scrub error
    }
    return event;
  },
});

const express = require('express');
const startJobArchiver = require('./cron/jobArchiver');
const startJobAlertsCron = require('./cron/jobAlerts');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { z } = require('zod');
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
const createDashboardArtisanRouter = require('./routes/dashboard-artisan');
const createDashboardEntrepriseRouter = require('./routes/dashboard-entreprise');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const jobsRouter = require('./routes/jobs');
const jobAlertsRouter = require('./routes/job-alerts');
const otpRouter = require('./routes/otp');
const usersRouter = require('./routes/users');
const { corsOptions, isAllowedOrigin, allowedOrigins } = require('./lib/cors');
const {
  cloudinary,
  upload,
  ALLOWED_UPLOAD_MIME,
  uploadsRoot,
  sniffFileType,
  safeExtensionForMime,
} = require('./lib/uploads');
const {
  apiGlobalLimiter,
  signupIpLimiter,
  loginIpLimiter,
  loginIdentifierLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verificationSubmissionLimiter,
  candidateProfileLimiter,
  savedJobsLimiter,
  jobApplicationLimiter,
  jobCreationLimiter,
  feedbackSubmissionLimiter,
  reviewSubmissionLimiter,
  uploadIpLimiter,
  reportSubmissionLimiter,
  privacyRequestLimiter,
  otpIpLimiter,
  otpPhoneLimiter,
  otpVerifyLimiter,
} = require('./lib/limiters');

const {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  createSessionToken,
  getSessionCookieOptions,
  readSessionToken,
  requireAdminSession,
  requireUserSession,
} = require('./lib/session');
const { validateBody, validateParams, validateQuery } = require('./lib/requestValidation');
const { requireSelfOrAdmin, hasRequiredSslMode, getDatabaseUsername } = require('./lib/security');
const { getPositiveIntegerEnv } = require('./lib/env');
const { ensureCsrfCookie, verifyCsrfToken, csrfTokenRoute } = require('./lib/csrf');

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

const TRUSTED_ORIGINS = new Set([
  ...allowedOrigins,
  ...parseCommaSeparatedValues(process.env.TRUSTED_ORIGINS),
]);

function extractOriginFromReferer(referer) {
  try {
    return new URL(String(referer || '')).origin;
  } catch {
    return '';
  }
}

function csrfOriginGuard(req, res, next) {
  const method = String(req.method || '').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const origin = String(req.get('origin') || '').trim();
  const refererOrigin = extractOriginFromReferer(req.get('referer'));
  const requestOrigin = origin || refererOrigin;

  if (!requestOrigin) {
    return res.status(403).json({ error: 'Origine requise pour cette requete.' });
  }

  if (TRUSTED_ORIGINS.has(requestOrigin) || isAllowedOrigin(requestOrigin)) {
    return next();
  }

  return res.status(403).json({ error: 'Origine non autorisee.' });
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors(corsOptions));

app.use('/api', apiGlobalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use('/api', csrfOriginGuard);
app.use('/api', ensureCsrfCookie);
app.use('/api', verifyCsrfToken);
app.use('/uploads', express.static(uploadsRoot, {
  setHeaders: (res) => {
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  },
}));
app.use('/api/admin', requireAdminSession);

app.use('/api/dashboard-artisan', createDashboardArtisanRouter({ prisma, requireUserSession }));
app.use('/api/dashboard-entreprise', createDashboardEntrepriseRouter({ prisma, requireUserSession }));
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/job-alerts', jobAlertsRouter);
app.use('/api/otp', otpRouter);
app.use('/api/users', usersRouter);
app.get('/api/csrf-token', csrfTokenRoute);

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

const contactTrackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRequestIpKey(req),
  message: { error: 'Trop de clics de contact. Reessayez dans une minute.' },
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

const userProfilePayloadSchema = z.object({
  fullName: z.string().max(160).optional(),
  title: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  availability: z.string().max(120).optional(),
  profileVisible: z.boolean().optional(),
  jobAlertRole: z.string().max(140).optional(),
  jobAlertCity: z.string().max(140).optional(),
  phone: z.string().max(60).optional(),
  email: z.string().max(190).optional(),
  profile: z.string().max(6000).optional(),
  defaultCvUrl: z.string().max(1000).optional(),
  experience: z.string().max(5000).optional(),
  education: z.string().max(5000).optional(),
  skillsText: z.string().max(2000).optional(),
  languagesText: z.string().max(1200).optional(),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const userIdParamSchema = z.object({ userId: z.coerce.number().int().positive() });
const verificationReviewParamSchema = z.object({ id: z.string().trim().min(1) });
const verificationStatusQuerySchema = z.object({
  role: z.string().trim().min(1),
  accountKey: z.string().trim().min(1),
});
const verificationSubmissionSchema = z.object({
  role: z.string().trim().min(1),
  accountKey: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  payload: z.object({}).passthrough(),
});
const verificationReviewBodySchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewedBy: z.string().trim().optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
});
const createUserBodySchema = z.object({
  email: z.string().trim().optional(),
  password: z.string().min(1),
  name: z.string().trim().optional(),
  role: z.enum(['CANDIDAT', 'ENTREPRISE', 'ARTISAN']).optional(),
  phone: z.string().trim().min(1),
  website: z.string().trim().optional(),
});
const updateUserBodySchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  isVerified: z.boolean().optional(),
  photoUrl: z.string().trim().max(1000).nullable().optional(),
});
const banUserBodySchema = z.object({
  banned: z.boolean(),
  reason: z.string().trim().max(1000).optional().nullable(),
});
const candidateCreateBodySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  nom: z.string().trim().min(1),
  titre: z.string().trim().min(1),
  localisation: z.string().trim().optional(),
  experience: z.string().trim().optional(),
  disponibilite: z.string().trim().optional(),
  etudes: z.string().trim().optional(),
  competences: z.array(z.string().trim()).optional(),
  disponibleNow: z.boolean().optional(),
});
const userPhotoBodySchema = z.object({
  photoUrl: z.string().trim().max(1000).nullable().optional(),
});
const idAndJobIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  jobId: z.coerce.number().int().positive(),
});
const savedJobBodySchema = z.object({
  jobId: z.coerce.number().int().positive(),
});
const idAndServiceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
});
const serviceCreateBodySchema = z.object({
  name: z.string().trim().min(1, 'Le nom du service est obligatoire.').max(180),
  description: z.string().trim().max(3000).optional().nullable(),
  price: z.string().trim().max(200).optional().nullable(),
});
const idAndPortfolioIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  portfolioId: z.coerce.number().int().positive(),
});
const portfolioCreateBodySchema = z.object({
  imageUrl: z.string().trim().min(1, 'imageUrl est obligatoire.').max(1200),
  title: z.string().trim().max(200).optional().nullable(),
});
const feedbackCreateBodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(5000),
});
const reviewTargetParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
const reviewCreateBodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(5000),
});
const privacyDeleteRequestBodySchema = z.object({
  reason: z.string().trim().max(1000).optional().nullable(),
});
const reportCreateBodySchema = z.object({
  reason: z.enum(['demande-argent', 'fausse-identite', 'artisan-injoignable']),
  targetType: z.enum(['annonce', 'artisan']),
  targetId: z.coerce.number().int().positive(),
});
const reportUpdateParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
const reportUpdateBodySchema = z.object({
  status: z.string().trim().min(1).max(50),
});
const adminPrivacyRequestParamSchema = z.object({
  reference: z.string().trim().min(1),
});
const adminPrivacyRequestPatchBodySchema = z.object({
  status: z.string().trim().optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
});
const adminBroadcastBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  type: z.string().trim().max(100).optional(),
  targetRole: z.string().trim().max(40).optional(),
});
const adminNotificationReadParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
const uploadQuerySchema = z.object({
  folder: z.string().trim().max(32).optional(),
}).passthrough();
const otpSendBodySchema = z.object({
  phone: z.string().trim().min(1),
});
const otpVerifyBodySchema = z.object({
  phone: z.string().trim().min(1),
  code: z.string().trim().min(1),
});
const forgotPasswordBodySchema = z.object({
  phone: z.string().trim().min(1),
});
const resetPasswordBodySchema = z.object({
  phone: z.string().trim().min(1),
  code: z.string().trim().min(1),
  newPassword: z.string().min(6),
});
const adminCreateEmailTicketBodySchema = z.object({
  senderEmail: z.string().trim().min(1).max(320),
  senderName: z.string().trim().max(200).optional().nullable(),
  subject: z.string().trim().min(1).max(500),
  body: z.string().max(20000).optional().nullable(),
});
const adminTicketParamSchema = z.object({
  ticketId: z.string().trim().min(1),
});
const adminAttachmentParamSchema = z.object({
  ticketId: z.string().trim().min(1),
  part: z.string().trim().min(1),
});
const adminPrivacyRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.string().trim().max(40).optional(),
  kind: z.string().trim().max(40).optional(),
  query: z.string().trim().max(160).optional(),
  q: z.string().trim().max(160).optional(),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).passthrough();
const adminNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  query: z.string().trim().max(160).optional(),
  q: z.string().trim().max(160).optional(),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).passthrough();
const adminMyNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  unreadOnly: z.string().trim().max(10).optional(),
  query: z.string().trim().max(160).optional(),
  q: z.string().trim().max(160).optional(),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).passthrough();
const adminTrendsQuerySchema = z.object({
  days: z.coerce.number().int().positive().optional(),
  locale: z.string().trim().max(10).optional(),
}).passthrough();

function profileFromBody(userId, body) {
  return {
    userId,
    fullName: String(body.fullName || ''),
    title: String(body.title || ''),
    location: String(body.location || ''),
    availability: String(body.availability || ''),
    profileVisible: body.profileVisible === undefined ? true : Boolean(body.profileVisible),
    jobAlertRole: String(body.jobAlertRole || ''),
    jobAlertCity: String(body.jobAlertCity || ''),
    phone: String(body.phone || ''),
    email: String(body.email || ''),
    profile: String(body.profile || ''),
    defaultCvUrl: String(body.defaultCvUrl || ''),
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
/*
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
*/

// =============================================
// ROUTES: Verifications (Identite)
// =============================================

// NOTE: GET /api/verifications (liste admin) a ete deplace vers routes/admin.js
// Nouveau chemin : GET /api/admin/verifications

// GET /api/verifications/status?role=artisan&accountKey=abc
app.get('/api/verifications/status', validateQuery(verificationStatusQuerySchema), async (req, res) => {
  const { role, accountKey } = req.query;

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
app.post('/api/verifications', verificationSubmissionLimiter, validateBody(verificationSubmissionSchema), async (req, res) => {
  try {
    const { role, accountKey, displayName, phone, payload } = req.body;

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

// NOTE: PATCH /api/verifications/:id/review a ete deplace vers routes/admin.js
// Nouveau chemin : PATCH /api/admin/verifications/:id/status

// =============================================
// ROUTES: Candidate Profiles / CVtheque
// =============================================

function isRecruiterRole(role) {
  const normalizedRole = String(role || '').toUpperCase();
  return normalizedRole === 'ENTREPRISE' || normalizedRole === 'ARTISAN' || normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';
}

app.get('/api/candidates', requireUserSession, async (req, res) => {
  try {
    const sessionRole = String(req.sessionUser?.role || '').toUpperCase();
    if (!isRecruiterRole(sessionRole)) {
      return res.status(403).json({ error: 'Acces CVtheque reserve aux recruteurs.' });
    }

    const page = parsePositiveInt(req.query.page) || 1;
    const limit = Math.min(parsePositiveInt(req.query.limit) || 24, 100);
    const skip = (page - 1) * limit;

    const search = String(req.query.search || '').trim();
    const location = String(req.query.location || '').trim();
    const experienceList = String(req.query.experience || '').split(',').map((item) => item.trim()).filter(Boolean);
    const availabilityList = String(req.query.availability || '').split(',').map((item) => item.trim()).filter(Boolean);
    const educationList = String(req.query.education || '').split(',').map((item) => item.trim()).filter(Boolean);
    const skillsList = String(req.query.skills || '').split(',').map((item) => item.trim()).filter(Boolean);
    const sortBy = String(req.query.sortBy || 'recent').trim().toLowerCase();
    const activeDays = parsePositiveInt(req.query.activeDays);
    const onlyImmediate = String(req.query.onlyImmediate || '').toLowerCase() === 'true';
    const onlyWithCv = String(req.query.onlyWithCv || '').toLowerCase() === 'true';

    const where = { AND: [] };

    if (search) {
      where.AND.push({
        OR: [
          { nom: { contains: search, mode: 'insensitive' } },
          { titre: { contains: search, mode: 'insensitive' } },
          { localisation: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (location) {
      where.AND.push({ localisation: { contains: location, mode: 'insensitive' } });
    }
    if (experienceList.length > 0) {
      where.AND.push({ experience: { in: experienceList } });
    }
    if (availabilityList.length > 0) {
      where.AND.push({ disponibilite: { in: availabilityList } });
    }
    if (educationList.length > 0) {
      where.AND.push({ etudes: { in: educationList } });
    }
    if (skillsList.length > 0) {
      where.AND.push({ competences: { hasSome: skillsList } });
    }
    if (onlyImmediate) {
      where.AND.push({ disponibleNow: true });
    }
    if (activeDays) {
      const boundary = new Date();
      boundary.setDate(boundary.getDate() - activeDays);
      where.AND.push({
        OR: [
          { createdAt: { gte: boundary } },
          { user: { is: { userProfile: { is: { updatedAt: { gte: boundary } } } } } },
        ],
      });
    }
    if (onlyWithCv) {
      where.AND.push({
        user: {
          is: {
            userProfile: {
              is: {
                defaultCvUrl: { not: '' },
              },
            },
          },
        },
      });
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sortBy === 'alpha') {
      orderBy = { nom: 'asc' };
    } else if (sortBy === 'availability') {
      orderBy = [{ disponibleNow: 'desc' }, { createdAt: 'desc' }];
    } else if (sortBy === 'experience') {
      orderBy = [{ experience: 'desc' }, { createdAt: 'desc' }];
    }

    const [total, rows] = await Promise.all([
      prisma.candidateProfile.count({ where: where.AND.length > 0 ? where : undefined }),
      prisma.candidateProfile.findMany({
        where: where.AND.length > 0 ? where : undefined,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              isVerified: true,
              userProfile: {
                select: {
                  defaultCvUrl: true,
                  profileVisible: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const candidates = rows.map((c) => ({
      ...c,
      cvMajJours: calcCvMajJours(c.createdAt),
      photoUrl: c.user?.photoUrl || null,
      defaultCvUrl: c.user?.userProfile?.defaultCvUrl || '',
      profileVisible: c.user?.userProfile?.profileVisible ?? true,
      lastProfileUpdateAt: c.user?.userProfile?.updatedAt || null,
    }));

    res.json({
      candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('GET /api/candidates error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des candidats.' });
  }
});

app.post('/api/candidates', requireUserSession, candidateProfileLimiter, validateBody(candidateCreateBodySchema), async (req, res) => {
  try {
    const sessionUserId = Number(req.sessionUser?.id || 0);
    const sessionRole = String(req.sessionUser?.role || '').toUpperCase();
    const isAdmin = sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';

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

    const normalizedUserId = userId ? parseInt(String(userId), 10) : sessionUserId;
    if (!normalizedUserId || Number.isNaN(normalizedUserId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide.' });
    }

    if (!isAdmin && normalizedUserId !== sessionUserId) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que votre profil candidat.' });
    }

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

app.get('/api/candidates/:id', requireUserSession, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID candidat invalide.' });

    const candidate = await prisma.candidateProfile.findUnique({ where: { id } });
    if (!candidate) return res.status(404).json({ error: 'Profil candidat non trouve.' });

    const sessionUserId = Number(req.sessionUser?.id || 0);
    const sessionRole = String(req.sessionUser?.role || '').toUpperCase();
    const isAdmin = sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';
    const isRecruiter = isRecruiterRole(sessionRole);

    if (!isAdmin && !isRecruiter && Number(candidate.userId || 0) !== sessionUserId) {
      return res.status(403).json({ error: 'Acces refuse a ce profil candidat.' });
    }

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
            defaultCvUrl: userProfile.defaultCvUrl,
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

app.get('/api/profiles/:userId', requireUserSession, requireSelfOrAdmin({ paramName: 'userId' }), async (req, res) => {
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

app.put('/api/profiles/:userId', requireUserSession, validateParams(userIdParamSchema), requireSelfOrAdmin({ paramName: 'userId' }), validateBody(userProfilePayloadSchema), async (req, res) => {
  try {
    const userId = Number(req.params.userId);
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

app.patch('/api/users/:id/photo', requireUserSession, validateParams(idParamSchema), validateBody(userPhotoBodySchema), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const sessionUser = req.sessionUser;
    const role = String(sessionUser?.role || '').toUpperCase();
    const canEdit = Number(sessionUser?.id) === id || role === 'ADMIN' || role === 'SUPER_ADMIN';

    if (!canEdit) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const rawPhotoUrl = req.body?.photoUrl;
    const photoUrl = rawPhotoUrl ? String(rawPhotoUrl).trim() : null;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { photoUrl },
      select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, isVerified: true, isBanned: true, createdAt: true },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('PATCH /api/users/:id/photo error:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise a jour de la photo.' });
  }
});

async function handleTrackContact(req, res) {
  try {
    const userId = parseInt(req.params.userId || req.params[0], 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide.' });
    }

    const artisan = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!artisan) {
      return res.status(404).json({ error: 'Artisan introuvable.' });
    }

    if (String(artisan.role || '').toUpperCase() !== 'ARTISAN') {
      return res.status(400).json({ error: 'Ce profil ne correspond pas a un artisan.' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          contactClicks: {
            increment: 1,
          },
        },
      }),
      prisma.contactClickEvent.create({
        data: {
          artisanId: userId,
        },
      }),
    ]);

    return res.json({ success: true, message: 'Contact comptabilise.' });
  } catch (error) {
    console.error('POST /api/profiles/:userId/track-contact error:', error);
    return res.status(500).json({ error: 'Erreur lors du suivi du contact.' });
  }
}

app.post('/api/profiles/:userId/track-contact', validateParams(userIdParamSchema), contactTrackingLimiter, handleTrackContact);
app.post('/api/profiles/:userId/trackContact', validateParams(userIdParamSchema), contactTrackingLimiter, handleTrackContact);
app.post('/api/artisans/:userId/track-contact', validateParams(userIdParamSchema), contactTrackingLimiter, handleTrackContact);

// =============================================
// ROUTES: Saved Jobs
// =============================================

app.get('/api/users/:id/saved-jobs', requireUserSession, requireSelfOrAdmin({ paramName: 'id' }), async (req, res) => {
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

app.post('/api/users/:id/saved-jobs', requireUserSession, validateParams(idParamSchema), requireSelfOrAdmin({ paramName: 'id' }), savedJobsLimiter, validateBody(savedJobBodySchema), async (req, res) => {
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

app.delete('/api/users/:id/saved-jobs/:jobId', requireUserSession, validateParams(idAndJobIdParamSchema), requireSelfOrAdmin({ paramName: 'id' }), async (req, res) => {
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
/*
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
*/

// POST /api/jobs — Créer une offre
/*
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
*/

// PUT /api/jobs/:id — Modifier une offre
/*
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
*/

// DELETE /api/jobs/:id — Supprimer une offre
app.delete(
  '/api/jobs/:id',
  requireUserSession,
  validateParams(idParamSchema),
  requireSelfOrAdmin({
    resolveOwnerId: async (req) => {
      const jobId = parseInt(req.params.id, 10);
      if (!Number.isInteger(jobId) || jobId <= 0) return Number.NaN;

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { authorId: true },
      });

      return job?.authorId ?? null;
    },
    notFoundMessage: 'Offre non trouvée.',
  }),
  async (req, res) => {
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
app.post('/api/users', signupIpLimiter, validateBody(createUserBodySchema), async (req, res) => {
  try {
    const { email, password, name, role, phone } = req.body;
    const honeypotValue = String(req.body?.website || '').trim();

    if (honeypotValue) {
      console.warn(`⚠️ Honeypot inscription declenche depuis IP=${req.ip || 'unknown'}`);
      return res.status(400).json({ error: 'Impossible de traiter cette inscription.' });
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

    void Promise.allSettled([
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
    // Prisma P2002 = unique constraint violated (race condition between pre-check and INSERT).
    if (error?.code === 'P2002') {
      const targets = Array.isArray(error?.meta?.target) ? error.meta.target : [];
      if (targets.includes('phone')) {
        return res.status(409).json({ error: 'Ce numéro de téléphone est déjà associé à un compte.' });
      }
      if (targets.includes('email')) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
      }
      return res.status(409).json({ error: 'Cet email ou ce numéro de téléphone est déjà utilisé.' });
    }
    reportError('POST /api/users error', error, { route: '/api/users' });
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur." });
  }
});

// PUT /api/users/:id — Modifier un utilisateur (role, verification, etc.)
app.put('/api/users/:id', requireAdminSession, validateParams(idParamSchema), validateBody(updateUserBodySchema), async (req, res) => {
  try {
    const id = Number(req.params.id);

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
app.put('/api/users/:id/ban', requireAdminSession, validateParams(idParamSchema), validateBody(banUserBodySchema), async (req, res) => {
  try {
    const id = Number(req.params.id);

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
app.delete('/api/users/:id', requireAdminSession, validateParams(idParamSchema), async (req, res) => {
  try {
    const id = Number(req.params.id);

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
app.get('/api/users/:id/notifications', requireUserSession, requireSelfOrAdmin({ paramName: 'id' }), async (req, res) => {
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
app.patch(
  '/api/notifications/:id/read',
  requireUserSession,
  validateParams(idParamSchema),
  requireSelfOrAdmin({
    resolveOwnerId: async (req) => {
      const notificationId = parseInt(req.params.id, 10);
      if (!Number.isInteger(notificationId) || notificationId <= 0) return Number.NaN;

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { userId: true },
      });

      return notification?.userId ?? null;
    },
    notFoundMessage: 'Notification non trouvee.',
  }),
  async (req, res) => {
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
app.patch('/api/users/:id/notifications/read-all', requireUserSession, validateParams(idParamSchema), requireSelfOrAdmin({ paramName: 'id' }), async (req, res) => {
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

// GET /api/users/:id/applications — Liste des candidatures envoyees par un candidat (temps reel)
app.get('/api/users/:id/applications', requireUserSession, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const sessionUserId = Number(req.sessionUser?.id || 0);
    const sessionRole = String(req.sessionUser?.role || '').toUpperCase();
    const isAdmin = sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';

    if (!isAdmin && sessionUserId !== userId) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const applicationsRows = await prisma.application.findMany({
      where: { candidateId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
          },
        },
      },
    });

    const statusLabelMap = {
      APPLIED: 'Candidature envoyée',
      PENDING: 'Candidature envoyée',
      REVIEWING: 'En cours d’étude',
      REVIEWED: 'En cours d’étude',
      INTERVIEW: 'Entretien',
      HIRED: 'Retenu',
      ACCEPTED: 'Retenu',
      REJECTED: 'Non retenu',
    };

    const applications = applicationsRows.map((row) => {
      const rawStatus = String(row.status || 'PENDING').toUpperCase();
      return {
        id: row.id,
        jobId: row.jobId || null,
        jobTitle: row.job?.title || '',
        company: row.job?.company || '',
        date: row.createdAt,
        status: rawStatus,
        statut: statusLabelMap[rawStatus] || 'En attente',
      };
    });

    res.json({ applications });
  } catch (error) {
    console.error('GET /api/users/:id/applications error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des candidatures.' });
  }
});

// GET /api/users/:id/services — Liste des services artisan
app.get('/api/users/:id/services', requireUserSession, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const sessionUserId = Number(req.sessionUser?.id || 0);
    const sessionRole = String(req.sessionUser?.role || '').toUpperCase();
    const isAdmin = sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';

    if (!isAdmin && sessionUserId !== userId) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const services = await prisma.artisanService.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ services });
  } catch (error) {
    console.error('GET /api/users/:id/services error:', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture des services artisan.' });
  }
});

// POST /api/users/:id/services — Ajouter un service artisan
app.post('/api/users/:id/services', requireUserSession, validateParams(idParamSchema), validateBody(serviceCreateBodySchema), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    if (Number(req.sessionUser?.id || 0) !== userId) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const price = String(req.body?.price || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Le nom du service est obligatoire.' });
    }

    // Tentative d'extraction d'un montant numérique (les utilisateurs peuvent saisir
    // "5000 FCFA / heure", "À partir de 10 000", etc.). Le texte libre reste préservé.
    const numericMatch = price.replace(/[\s ]/g, '').match(/(\d+(?:[.,]\d+)?)/);
    const priceAmount = numericMatch ? Number(numericMatch[1].replace(',', '.')) : null;

    const service = await prisma.artisanService.create({
      data: {
        userId,
        name,
        description: description || null,
        price: price || null,
        priceAmount: Number.isFinite(priceAmount) && priceAmount > 0 ? priceAmount : null,
      },
    });

    return res.status(201).json({ success: true, service });
  } catch (error) {
    console.error('POST /api/users/:id/services error:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la creation du service.' });
  }
});

// DELETE /api/users/:id/services/:serviceId — Supprimer un service artisan
app.delete('/api/users/:id/services/:serviceId', requireUserSession, validateParams(idAndServiceIdParamSchema), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const serviceId = parseInt(req.params.serviceId, 10);
    if (isNaN(userId) || isNaN(serviceId)) {
      return res.status(400).json({ error: 'Identifiants invalides.' });
    }

    if (Number(req.sessionUser?.id || 0) !== userId) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const existing = await prisma.artisanService.findUnique({
      where: { id: serviceId },
      select: { id: true, userId: true },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Service introuvable.' });
    }

    await prisma.artisanService.delete({ where: { id: serviceId } });
    return res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/:id/services/:serviceId error:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la suppression du service.' });
  }
});

// GET /api/users/:id/portfolio — Liste du portfolio artisan
app.get('/api/users/:id/portfolio', requireUserSession, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const sessionUserId = Number(req.sessionUser?.id || 0);
    const sessionRole = String(req.sessionUser?.role || '').toUpperCase();
    const isAdmin = sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';

    if (!isAdmin && sessionUserId !== userId) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(24, Math.max(1, parseInt(String(req.query.limit || '9'), 10) || 9));
    const skip = (page - 1) * limit;

    const [portfolio, total] = await Promise.all([
      prisma.artisanPortfolio.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.artisanPortfolio.count({ where: { userId } }),
    ]);

    return res.json({
      portfolio,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('GET /api/users/:id/portfolio error:', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture du portfolio artisan.' });
  }
});

// POST /api/users/:id/portfolio — Ajouter une image portfolio
app.post('/api/users/:id/portfolio', requireUserSession, validateParams(idParamSchema), validateBody(portfolioCreateBodySchema), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    if (Number(req.sessionUser?.id || 0) !== userId) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const imageUrl = String(req.body?.imageUrl || '').trim();
    const title = String(req.body?.title || '').trim();

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl est obligatoire.' });
    }

    const portfolioItem = await prisma.artisanPortfolio.create({
      data: {
        userId,
        imageUrl,
        title: title || null,
      },
    });

    return res.status(201).json({ success: true, portfolioItem });
  } catch (error) {
    console.error('POST /api/users/:id/portfolio error:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de l ajout du portfolio.' });
  }
});

// DELETE /api/users/:id/portfolio/:portfolioId — Supprimer une image portfolio
app.delete('/api/users/:id/portfolio/:portfolioId', requireUserSession, validateParams(idAndPortfolioIdParamSchema), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const portfolioId = parseInt(req.params.portfolioId, 10);
    if (isNaN(userId) || isNaN(portfolioId)) {
      return res.status(400).json({ error: 'Identifiants invalides.' });
    }

    if (Number(req.sessionUser?.id || 0) !== userId) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const existing = await prisma.artisanPortfolio.findUnique({
      where: { id: portfolioId },
      select: { id: true, userId: true },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Image portfolio introuvable.' });
    }

    await prisma.artisanPortfolio.delete({ where: { id: portfolioId } });
    return res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/:id/portfolio/:portfolioId error:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la suppression du portfolio.' });
  }
});

// =============================================
// ROUTES: App Feedbacks
// =============================================

app.post('/api/feedbacks', requireUserSession, feedbackSubmissionLimiter, validateBody(feedbackCreateBodySchema), async (req, res) => {
  try {
    const { rating, comment } = req.body || {};
    const sessionUserId = Number(req.sessionUser?.id || 0);
    const sessionAuthorName = String(req.sessionUser?.name || '').trim() || null;

    const parsedRating = parseInt(String(rating), 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'La note doit etre comprise entre 1 et 5.' });
    }

    const normalizedComment = String(comment || '').trim();
    if (normalizedComment.length < 3) {
      return res.status(400).json({ error: 'Commentaire trop court (minimum 3 caracteres).' });
    }

    const row = await prisma.appFeedback.create({
      data: {
        userId: sessionUserId,
        authorName: sessionAuthorName,
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

app.post('/api/users/:id/reviews', requireUserSession, reviewSubmissionLimiter, validateParams(reviewTargetParamSchema), validateBody(reviewCreateBodySchema), async (req, res) => {
  try {
    const reviewedId = parseInt(req.params.id, 10);
    if (isNaN(reviewedId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const { rating, comment } = req.body || {};
    const parsedReviewerId = Number(req.sessionUser?.id || 0);
    const parsedRating = parseInt(String(rating), 10);

    if (!parsedReviewerId) return res.status(401).json({ error: 'Session requise.' });
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
// Routes /api/auth/* migrees vers backend/routes/auth.js

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

app.post('/api/privacy/delete-request', requireUserSession, privacyRequestLimiter, validateBody(privacyDeleteRequestBodySchema), async (req, res) => {
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

// NOTE: GET /api/reports (liste admin) a ete deplace vers routes/admin.js
// Nouveau chemin : GET /api/admin/reports

// POST /api/reports — Créer un signalement
app.post('/api/reports', reportSubmissionLimiter, validateBody(reportCreateBodySchema), async (req, res) => {
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

// NOTE: PUT /api/reports/:id a ete deplace vers routes/admin.js
// Nouveau chemin : PATCH /api/admin/reports/:id/status

// =============================================
// ROUTES: Admin
// =============================================
// Toutes les routes /api/admin/* ont ete migrees vers backend/routes/admin.js

// =============================================
// ROUTES: File Upload (Cloudinary)
// =============================================

app.post('/api/upload', uploadIpLimiter, validateQuery(uploadQuerySchema), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!ALLOWED_UPLOAD_MIME.has(String(req.file.mimetype || '').toLowerCase())) {
      return res.status(400).json({ error: 'Type de fichier non autorise. Formats acceptes: jpeg, png, webp, pdf, doc, docx.' });
    }

    const safeFolder = String(req.query.folder || 'general')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 32) || 'general';

    const detectedType = await sniffFileType(req.file.buffer, req.file.mimetype);
    if (!detectedType || !ALLOWED_UPLOAD_MIME.has(detectedType)) {
      return res.status(415).json({ error: 'Type de fichier reel invalide.' });
    }

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

    const extension = safeExtensionForMime(detectedType);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
    const targetDir = path.join(uploadsRoot, safeFolder);
    if (!targetDir.startsWith(uploadsRoot + path.sep) && targetDir !== uploadsRoot) {
      return res.status(400).json({ error: 'Folder invalide.' });
    }
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
// Routes /api/otp/* migrees vers backend/routes/otp.js

// =============================================
// ROUTES: RESET MOT DE PASSE (via OTP telephone)
// =============================================
// Routes /api/auth/forgot-password et /api/auth/reset-password migrees vers backend/routes/auth.js

// =============================================
// ROUTES: Boite de Reception (Hostinger IMAP + legacy webhook)
// =============================================
// Routes /api/admin/emails* migrees vers backend/routes/admin.js

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

// Global error handler — catches any error passed via next(err) or thrown
// in an async route that uses a wrapper.  Must have 4 parameters so Express
// recognises it as an error-handling middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = typeof err.status === 'number' ? err.status
    : typeof err.statusCode === 'number' ? err.statusCode
    : 500;

  const message = err instanceof Error ? err.message : String(err || 'Internal server error');

  // Always log the full stack trace so it appears in production logs.
  console.error(
    `[ERROR] ${req.method} ${req.path} → ${statusCode}: ${message}`,
    err?.stack || '',
  );

  // Capture in Sentry if not already done by setupExpressErrorHandler.
  if (statusCode >= 500) {
    reportError(`${req.method} ${req.path}`, err, { statusCode });
  }

  if (res.headersSent) return;
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : message,
  });
});

// Démarrage des tâches automatisées
startJobArchiver(prisma);
startJobAlertsCron(prisma);

// --- Start server ---
const PORT = process.env.PORT || 5000;
const HOST = String(process.env.HOST || '').trim();
const listenArgs = HOST ? [PORT, HOST] : [PORT];
const server = app.listen(...listenArgs, () => {
  console.log(`\n========================================`);
  console.log(`Backend Bolo237 en ligne !`);
  console.log(`Ecoute sur ${HOST || '0.0.0.0'}:${PORT}`);
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
