const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
const { requireAdminSession } = require('../lib/session');
const { getPlatformSettings, setPlatformSettings } = require('../lib/settings');
const { createAdminNotifications } = require('../lib/notifications');
const { parseDateOnlyFilter, buildDateRangeFilter, buildDateBuckets, toDayKey, formatShortDate } = require('../lib/dates');
const { normalizePrivacyRequestStatus, normalizePrivacyRequestKind, normalizePrivacyNotes } = require('../lib/privacy');
const { sendWhatsAppModerationAlert } = require('../lib/twilioService');
const { transporter } = require('../lib/emailService');
const {
  archiveAdminInboxTicket,
  downloadAdminInboxAttachment,
  getAdminInbox,
  getAdminInboxSummary,
  markAdminInboxTicketRead,
  replyToAdminInboxTicket,
  trashAdminInboxTicket,
} = require('../lib/adminInboxService');

// ⚠️ Toutes les routes de ce fichier auront "/api/admin" en préfixe via server.js
// Donc "router.get('/stats')" deviendra "/api/admin/stats"

// Toutes tes routes admin (stats, privacy-requests, reviews, users, trends, banned-users, notifications, emails...)
// ✂️ Colle TOUT ici, et enlève juste le "/api/admin" au début de chaque route.

// Exemple :
// router.get('/stats', requireAdminSession, async (req, res) => { ... });
// router.get('/privacy-requests', requireAdminSession, async (req, res) => { ... });
// etc.

module.exports = router;