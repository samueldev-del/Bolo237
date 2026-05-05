const express = require('express');
const { z } = require('zod');
const { prisma } = require('../lib/db');
const { requireUserSession } = require('../lib/session');
const { validateBody, validateParams } = require('../lib/requestValidation');

const router = express.Router();

const frequencySchema = z.enum(['DAILY', 'WEEKLY']);

const createAlertSchema = z.object({
  keywords: z.string().trim().min(2, 'Les mots-clés sont requis.').max(160),
  location: z.string().trim().max(140).optional().nullable(),
  frequency: frequencySchema.default('DAILY'),
  isActive: z.boolean().optional(),
}).strict();

const updateAlertSchema = z.object({
  keywords: z.string().trim().min(2).max(160).optional(),
  location: z.string().trim().max(140).optional().nullable(),
  frequency: frequencySchema.optional(),
  isActive: z.boolean().optional(),
}).strict().refine((payload) => Object.keys(payload).length > 0, {
  message: 'Aucun champ à mettre à jour.',
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

function normalizeLocation(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

// GET /api/job-alerts — Liste des alertes du candidat connecté
router.get('/', requireUserSession, async (req, res) => {
  try {
    const userId = req.sessionUser.id;
    const alerts = await prisma.jobAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, alerts });
  } catch (error) {
    console.error('GET /api/job-alerts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne lors de la récupération des alertes.',
    });
  }
});

// POST /api/job-alerts — Création d’une alerte
router.post('/', requireUserSession, validateBody(createAlertSchema), async (req, res) => {
  try {
    const userId = req.sessionUser.id;
    const payload = req.body;

    const alert = await prisma.jobAlert.create({
      data: {
        userId,
        keywords: payload.keywords,
        location: normalizeLocation(payload.location),
        frequency: payload.frequency,
        isActive: payload.isActive ?? true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Alerte enregistrée avec succès.',
      alert,
    });
  } catch (error) {
    console.error('POST /api/job-alerts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne lors de la création de l’alerte.',
    });
  }
});

// PATCH /api/job-alerts/:id — Modification (fréquence, filtres, activation)
router.patch('/:id', requireUserSession, validateParams(idParamSchema), validateBody(updateAlertSchema), async (req, res) => {
  try {
    const userId = req.sessionUser.id;
    const alertId = Number(req.params.id);

    const existing = await prisma.jobAlert.findFirst({
      where: { id: alertId, userId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Alerte introuvable.',
      });
    }

    const data = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'keywords')) data.keywords = req.body.keywords;
    if (Object.prototype.hasOwnProperty.call(req.body, 'location')) data.location = normalizeLocation(req.body.location);
    if (Object.prototype.hasOwnProperty.call(req.body, 'frequency')) data.frequency = req.body.frequency;
    if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) data.isActive = req.body.isActive;

    const alert = await prisma.jobAlert.update({
      where: { id: alertId },
      data,
    });

    return res.json({
      success: true,
      message: 'Alerte mise à jour.',
      alert,
    });
  } catch (error) {
    console.error('PATCH /api/job-alerts/:id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne lors de la mise à jour de l’alerte.',
    });
  }
});

// DELETE /api/job-alerts/:id — Suppression
router.delete('/:id', requireUserSession, validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = req.sessionUser.id;
    const alertId = Number(req.params.id);

    const deleted = await prisma.jobAlert.deleteMany({
      where: { id: alertId, userId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alerte introuvable.',
      });
    }

    return res.json({
      success: true,
      message: 'Alerte supprimée.',
    });
  } catch (error) {
    console.error('DELETE /api/job-alerts/:id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne lors de la suppression de l’alerte.',
    });
  }
});

module.exports = router;
