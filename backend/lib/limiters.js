const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { getPositiveIntegerEnv } = require('./env');
const { getRequestIpKey } = require('./security');

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
