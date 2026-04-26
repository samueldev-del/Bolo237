const crypto = require('crypto');
const { prisma } = require('./db');
const { getRequestSourceIp } = require('./security');

const PRIVACY_REQUEST_KIND_ALLOWLIST = new Set(['EXPORT', 'DELETE']);
const PRIVACY_REQUEST_STATUS_ALLOWLIST = new Set(['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED']);

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

async function createPrivacyRequestLog({
  reference, kind, status = 'PENDING', user, reason, delivery, req, notes, payload, processedAt, processedBy,
}) {
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

module.exports = {
  PRIVACY_REQUEST_KIND_ALLOWLIST,
  PRIVACY_REQUEST_STATUS_ALLOWLIST,
  buildPrivacyReference,
  normalizePrivacyRequestKind,
  normalizePrivacyRequestStatus,
  normalizePrivacyNotes,
  createPrivacyRequestLog,
};
