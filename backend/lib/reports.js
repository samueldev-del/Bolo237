const crypto = require('crypto');
const { ipKeyGenerator } = require('express-rate-limit');
const { prisma } = require('./db');

const REPORT_TARGET_ALLOWLIST = new Set(['annonce', 'artisan']);
const REPORT_REASON_ALLOWLIST = new Set(['demande-argent', 'fausse-identite', 'artisan-injoignable']);
const REPORT_DEDUPE_WINDOW_MS = 12 * 60 * 60 * 1000;
const REPORT_REVIEW_THRESHOLD = 3;

const recentReportSubmissions = new Map();

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

module.exports = {
  REPORT_TARGET_ALLOWLIST,
  REPORT_REASON_ALLOWLIST,
  REPORT_DEDUPE_WINDOW_MS,
  REPORT_REVIEW_THRESHOLD,
  recentReportSubmissions,
  normalizeReportTargetType,
  normalizeReportReason,
  cleanupRecentReportSubmissions,
  getRequestFingerprint,
  reportTargetExists,
  buildReportSummary,
};
