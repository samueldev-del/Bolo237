const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
const { requireAdminSession } = require('../lib/session');
const { z } = require('zod');
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

// 🛡️ Schéma ultra-strict juste pour le statut
const statusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING', 'CLOSED'])
});

// ==========================================
// 🚀 ROUTE ADMIN : MODIFIER LE STATUT D'UNE OFFRE
// ==========================================
router.patch('/jobs/:id/status', requireAdminSession, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: 'Identifiant offre invalide.' });
    }

    // Validation Zod du statut
    const { status } = await statusSchema.parseAsync(req.body);

    // Mise à jour directe (sans vérifier l'authorId car on est Admin !)
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status }
    });

    res.json({
      success: true,
      message: `Statut mis a jour : ${status}`,
      job: updatedJob
    });

  } catch (error) {
    console.error('Erreur Admin Update Job Status:', error);
    if (error?.errors) {
      return res.status(400).json({ success: false, message: 'Statut invalide.' });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Offre introuvable.' });
    }
    res.status(500).json({ success: false, message: 'Erreur lors de la mise a jour.' });
  }
});

module.exports = router;