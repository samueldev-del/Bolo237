const express = require('express');
const router = express.Router();
const { z } = require('zod');

const { prisma } = require('../lib/db');
const { requireAdminSession } = require('../lib/session');
const { verificationSubmissionLimiter } = require('../lib/limiters');
const { sendWhatsAppModerationAlert } = require('../lib/twilioService');
const { createNotification } = require('../lib/notifications');
const { sendAccountVerifiedEmail, transporter } = require('../lib/transactionalEmail');
const { reportError } = require('../lib/observability');
const { validateBody, validateQuery, validateParams } = require('../lib/requestValidation');

const verificationStatusQuerySchema = z.object({
  role: z.string().trim().min(1, 'Parametre role requis.'),
  accountKey: z.string().trim().min(1, 'Parametre accountKey requis.'),
});

const verificationSubmissionSchema = z.object({
  role: z.string().trim().min(1, 'Champ role requis.'),
  accountKey: z.string().trim().min(1, 'Champ accountKey requis.'),
  displayName: z.string().trim().min(1, 'Champ displayName requis.'),
  phone: z.string().trim().min(1, 'Champ phone requis.'),
  payload: z.object({}).passthrough(),
});

const verificationReviewParamsSchema = z.object({
  id: z.string().trim().min(1, 'Identifiant requis.'),
});

const verificationReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewedBy: z.string().trim().optional(),
  notes: z.string().trim().max(5000, 'Notes trop longues.').optional().nullable(),
});

// GET /api/verifications — File complete des demandes
router.get('/', requireAdminSession, async (req, res) => {
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
router.get('/status', validateQuery(verificationStatusQuerySchema), async (req, res) => {
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
router.post('/', verificationSubmissionLimiter, validateBody(verificationSubmissionSchema), async (req, res) => {
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

// PATCH /api/verifications/:id/review — Decision super admin
router.patch('/:id/review', requireAdminSession, validateParams(verificationReviewParamsSchema), validateBody(verificationReviewSchema), async (req, res) => {
  const id = String(req.params.id);
  const { status, reviewedBy, notes } = req.body;

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
      const rawPayload = updated.payload || {};
      const maybeUserId = Number((typeof rawPayload === 'object' ? rawPayload.userId : null) || 0);
      let userToVerify = null;

      if (Number.isFinite(maybeUserId) && maybeUserId > 0) {
        userToVerify = await prisma.user.findUnique({ where: { id: maybeUserId } }).catch(() => null);
      }

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

module.exports = router;