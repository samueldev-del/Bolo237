const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getPositiveIntegerEnv } = require('./env');
const { getRequestIpKey } = require('./security');
const { getRedisClient, getRedisUrl } = require('./redis');

const redisUrl = getRedisUrl();
const globalPrefix = String(process.env.RATE_LIMIT_REDIS_PREFIX || 'rl:').trim() || 'rl:';

function makeRedisStore(name) {
  if (!redisUrl) return undefined;
  return new RedisStore({
    prefix: `${globalPrefix}${name}:`,
    sendCommand: async (...args) => {
      const client = await getRedisClient();
      if (!client) {
        throw new Error('Redis indisponible pour le rate limiting.');
      }
      return client.sendCommand(args);
    },
  });
}

function createLimiter(name, config) {
  const store = makeRedisStore(name);
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...(store ? { store } : {}),
    ...config,
  });
}

function getSessionUserId(req) {
  const sessionUserId = parseInt(String(req.sessionUser?.id || ''), 10);
  return Number.isFinite(sessionUserId) && sessionUserId > 0 ? sessionUserId : null;
}

const apiGlobalLimiter = createLimiter('api-global', {
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Trop de requetes depuis cette IP. Reessayez dans 15 minutes.' },
});

const signupIpLimiter = createLimiter('signup-ip', {
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('SIGNUP_IP_DAILY_LIMIT', 3),
  keyGenerator: (req) => getRequestIpKey(req),
  message: {
    error: 'Trop de creations de compte depuis cette IP aujourd hui. Reessayez demain ou contactez le support.',
  },
});

const loginIpLimiter = createLimiter('login-ip', {
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => getRequestIpKey(req),
  message: { error: 'Trop de tentatives de connexion depuis cette IP. Reessayez dans 15 minutes.' },
});

const loginIdentifierLimiter = createLimiter('login-id', {
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const loginIdentifier = String(req.body?.identifier || req.body?.email || req.body?.phone || '')
      .trim()
      .toLowerCase();

    return loginIdentifier || getRequestIpKey(req);
  },
  message: { error: 'Trop de tentatives de connexion pour cet identifiant. Reessayez dans 15 minutes.' },
});

const forgotPasswordLimiter = createLimiter('forgot-pwd', {
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de demandes de reinitialisation pour ce numero. Reessayez dans 15 minutes.' },
});

const resetPasswordLimiter = createLimiter('reset-pwd', {
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de tentatives de reinitialisation pour ce numero. Reessayez dans 15 minutes.' },
});

const verificationSubmissionLimiter = createLimiter('verification', {
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('VERIFICATION_SUBMISSION_DAILY_LIMIT', 6),
  keyGenerator: (req) => {
    const accountKey = String(req.body?.accountKey || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return accountKey || phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de demandes de verification aujourd hui. Reessayez plus tard.' },
});

const candidateProfileLimiter = createLimiter('candidate-profile', {
  windowMs: 60 * 60 * 1000,
  max: getPositiveIntegerEnv('CANDIDATE_PROFILE_HOURLY_LIMIT', 20),
  keyGenerator: (req) => {
    const userId = getSessionUserId(req) || parseInt(String(req.body?.userId || ''), 10);
    return Number.isFinite(userId) && userId > 0 ? `candidate-profile:${userId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop de mises a jour de profil candidat. Reessayez dans une heure.' },
});

const savedJobsLimiter = createLimiter('saved-jobs', {
  windowMs: 15 * 60 * 1000,
  max: getPositiveIntegerEnv('SAVED_JOBS_15M_LIMIT', 120),
  keyGenerator: (req) => {
    const userId = getSessionUserId(req) || parseInt(String(req.params?.id || req.body?.userId || ''), 10);
    return Number.isFinite(userId) && userId > 0 ? `saved-jobs:${userId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop de modifications sur vos favoris. Reessayez dans 15 minutes.' },
});

const jobApplicationLimiter = createLimiter('job-apply', {
  windowMs: 60 * 60 * 1000,
  max: getPositiveIntegerEnv('JOB_APPLICATION_HOURLY_LIMIT', 30),
  keyGenerator: (req) => {
    // Priorité session, fallback body legacy, puis IP. getSessionUserId gère les deux.
    const candidateId = getSessionUserId(req) || parseInt(String(req.body?.candidateId || ''), 10);
    return Number.isFinite(candidateId) && candidateId > 0 ? `job-apply:${candidateId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop de candidatures envoyees en une heure. Reessayez plus tard.' },
});

const jobCreationLimiter = createLimiter('job-create', {
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('JOB_CREATION_DAILY_LIMIT', 12),
  keyGenerator: (req) => {
    const authorId = getSessionUserId(req) || parseInt(String(req.body?.authorId || ''), 10);
    return Number.isFinite(authorId) && authorId > 0 ? `job-create:${authorId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop d annonces creees aujourd hui. Reessayez demain ou contactez le support.' },
});

const feedbackSubmissionLimiter = createLimiter('feedback', {
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('APP_FEEDBACK_DAILY_LIMIT', 5),
  keyGenerator: (req) => {
    const userId = getSessionUserId(req) || parseInt(String(req.body?.userId || ''), 10);
    return Number.isFinite(userId) && userId > 0 ? `app-feedback:${userId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop de retours envoyes aujourd hui. Merci de reessayer plus tard.' },
});

const reviewSubmissionLimiter = createLimiter('review', {
  windowMs: 24 * 60 * 60 * 1000,
  max: getPositiveIntegerEnv('USER_REVIEW_DAILY_LIMIT', 12),
  keyGenerator: (req) => {
    const reviewerId = getSessionUserId(req) || parseInt(String(req.body?.reviewerId || ''), 10);
    return Number.isFinite(reviewerId) && reviewerId > 0 ? `user-review:${reviewerId}` : getRequestIpKey(req);
  },
  message: { error: 'Trop d avis envoyes aujourd hui. Reessayez demain.' },
});

const uploadIpLimiter = createLimiter('upload-ip', {
  windowMs: 15 * 60 * 1000,
  max: getPositiveIntegerEnv('UPLOAD_IP_15M_LIMIT', 25),
  keyGenerator: (req) => getRequestIpKey(req),
  message: { error: 'Trop de televersements depuis cette IP. Reessayez dans 15 minutes.' },
});

const reportSubmissionLimiter = createLimiter('report', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown'),
  message: { error: 'Trop de signalements depuis cette IP. Reessayez plus tard.' },
});

const privacyRequestLimiter = createLimiter('privacy', {
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown'),
  message: { error: 'Trop de demandes de confidentialite pour le moment. Reessayez plus tard.' },
});

const otpIpLimiter = createLimiter('otp-ip', {
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Trop de demandes OTP depuis cette IP. Reessayez dans 15 minutes.' },
});

const otpPhoneLimiter = createLimiter('otp-phone', {
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de demandes OTP pour ce numero. Reessayez dans 15 minutes.' },
});

const otpVerifyLimiter = createLimiter('otp-verify', {
  windowMs: 15 * 60 * 1000,
  max: getPositiveIntegerEnv('OTP_VERIFY_15M_LIMIT', 10),
  keyGenerator: (req) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    return phone || getRequestIpKey(req);
  },
  message: { error: 'Trop de tentatives de verification OTP. Reessayez dans 15 minutes.' },
});

module.exports = {
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
};
