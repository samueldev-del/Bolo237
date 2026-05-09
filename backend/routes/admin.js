const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
const { requireAdminSession } = require('../lib/session');
const { z } = require('zod');
const { validateBody, validateParams, validateQuery } = require('../lib/requestValidation');
const { getPlatformSettings, setPlatformSettings } = require('../lib/settings');
const { createAdminNotifications, createNotification } = require('../lib/notifications');
const { parseDateOnlyFilter, buildDateRangeFilter, buildDateBuckets, toDayKey, formatShortDate } = require('../lib/dates');
const { normalizePrivacyRequestStatus, normalizePrivacyRequestKind, normalizePrivacyNotes } = require('../lib/privacy');
const { sendWhatsAppModerationAlert } = require('../lib/twilioService');
const { transporter } = require('../lib/emailService');
const { sendAccountVerifiedEmail } = require('../lib/transactionalEmail');
const {
  archiveAdminInboxTicket,
  downloadAdminInboxAttachment,
  getAdminInbox,
  getAdminInboxSummary,
  markAdminInboxTicketRead,
  replyToAdminInboxTicket,
  trashAdminInboxTicket,
} = require('../lib/adminInboxService');

const statusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING', 'CLOSED'])
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
const adminCreateEmailTicketBodySchema = z.object({
  senderEmail: z.string().trim().min(1).max(320),
  senderName: z.string().trim().max(200).optional().nullable(),
  subject: z.string().trim().min(1).max(500),
  body: z.string().max(20000).optional().nullable(),
});
const adminReplyEmailBodySchema = z.object({
  ticketId: z.coerce.number().int().positive(),
  replyMessage: z.string().trim().min(1).max(20000),
  customerEmail: z.string().trim().email().optional(),
  subject: z.string().trim().max(500).optional(),
}).passthrough();
const adminTicketParamSchema = z.object({
  ticketId: z.string().trim().min(1),
});
const adminAttachmentParamSchema = z.object({
  ticketId: z.string().trim().min(1),
  part: z.string().trim().min(1),
});
const adminJobParamSchema = z.object({
  id: z.coerce.number().int().positive(),
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

router.get('/jobs', requireAdminSession, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const skip = (page - 1) * limit;
    const status = String(req.query.status || '').trim().toUpperCase();
    const search = String(req.query.search || '').trim();

    const where = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isVerified: true,
              photoUrl: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/jobs error:', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture des offres admin.' });
  }
});

router.get('/jobs/:id', requireAdminSession, validateParams(adminJobParamSchema), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isVerified: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Offre introuvable.' });
    }

    return res.json(job);
  } catch (error) {
    console.error('GET /api/admin/jobs/:id error:', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture de cette offre.' });
  }
});

router.delete('/jobs/:id', requireAdminSession, validateParams(adminJobParamSchema), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.job.delete({ where: { id } });
    return res.json({ success: true, message: 'Offre supprimee.' });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Offre introuvable.' });
    }

    console.error('DELETE /api/admin/jobs/:id error:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de cette offre.' });
  }
});

// ==========================================
// 🚀 ROUTE ADMIN : MODIFIER LE STATUT D'UNE OFFRE
// ==========================================
router.patch('/jobs/:id/status', requireAdminSession, validateBody(statusSchema), async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: 'Identifiant offre invalide.' });
    }

    // Validation Zod du statut
    const { status } = req.body;

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
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Offre introuvable.' });
    }
    res.status(500).json({ success: false, message: 'Erreur lors de la mise a jour.' });
  }
});

// GET /stats - global admin statistics
router.get('/stats', requireAdminSession, async (_req, res) => {
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

router.get('/analytics/jobs', requireAdminSession, async (_req, res) => {
  try {
    const [jobAggregates, totalApplications, topJobs] = await Promise.all([
      prisma.job.aggregate({
        _sum: {
          viewCount: true,
          applyClickCount: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.application.count(),
      prisma.job.findMany({
        orderBy: [
          { viewCount: 'desc' },
          { applyClickCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 8,
        select: {
          id: true,
          title: true,
          company: true,
          viewCount: true,
          applyClickCount: true,
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
    ]);

    const totalViews = Number(jobAggregates._sum.viewCount || 0);
    const totalApplyClicks = Number(jobAggregates._sum.applyClickCount || 0);
    const listingsTracked = Number(jobAggregates._count.id || 0);
    const overallCtr = totalViews > 0 ? Number(((totalApplyClicks / totalViews) * 100).toFixed(1)) : 0;

    return res.json({
      summary: {
        totalViews,
        totalApplyClicks,
        totalApplications,
        listingsTracked,
        overallCtr,
      },
      jobs: topJobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        viewCount: job.viewCount,
        applyClickCount: job.applyClickCount,
        applicationCount: job._count.applications,
        ctr: job.viewCount > 0 ? Number(((job.applyClickCount / job.viewCount) * 100).toFixed(1)) : 0,
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/analytics/jobs error:', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture des analytics.' });
  }
});

// GET /privacy-requests
router.get('/privacy-requests', requireAdminSession, validateQuery(adminPrivacyRequestsQuerySchema), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
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

// PATCH /privacy-requests/:reference
router.patch('/privacy-requests/:reference', requireAdminSession, validateParams(adminPrivacyRequestParamSchema), validateBody(adminPrivacyRequestPatchBodySchema), async (req, res) => {
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

// GET /reviews
router.get('/reviews', requireAdminSession, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || '50'), 10) || 50);
    const reviews = await prisma.userReview.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reviewed: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true, role: true } },
      },
    });

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

// GET /users
router.get('/users', requireAdminSession, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || '50'), 10) || 50);
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

// GET /trends
router.get('/trends', requireAdminSession, validateQuery(adminTrendsQuerySchema), async (req, res) => {
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

// GET /banned-users
router.get('/banned-users', requireAdminSession, async (req, res) => {
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

// POST /notifications/broadcast
router.post('/notifications/broadcast', requireAdminSession, validateBody(adminBroadcastBodySchema), async (req, res) => {
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

// GET /notifications
router.get('/notifications', requireAdminSession, validateQuery(adminNotificationsQuerySchema), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
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

// GET /me/notifications
router.get('/me/notifications', requireAdminSession, validateQuery(adminMyNotificationsQuerySchema), async (req, res) => {
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

// PATCH /me/notifications/:id/read
router.patch('/me/notifications/:id/read', requireAdminSession, validateParams(adminNotificationReadParamSchema), async (req, res) => {
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

// PATCH /me/notifications/read-all
router.patch('/me/notifications/read-all', requireAdminSession, async (req, res) => {
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

// GET /search
router.get('/search', requireAdminSession, async (req, res) => {
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

// GET /settings
router.get('/settings', requireAdminSession, (_req, res) => {
  res.json(getPlatformSettings());
});

// PUT /settings — schema strict (anti-mass-assignment).
// Toute extension du shape doit passer par cette whitelist explicite.
const moderationRulesSchema = z.object({
  autoApproveAfterPosts: z.number().int().min(0).max(1000).optional(),
  blockedKeywords: z.array(z.string().trim().min(1).max(120)).max(200).optional(),
}).strict();

const notificationPreferencesSchema = z.object({
  emailOnNewReport: z.boolean().optional(),
  whatsappOnNewJob: z.boolean().optional(),
  emailOnInternalAdminAlert: z.boolean().optional(),
  whatsappOnInternalAdminAlert: z.boolean().optional(),
}).strict();

const platformSettingsSchema = z.object({
  platformName: z.string().trim().min(1).max(80).optional(),
  maintenanceMode: z.boolean().optional(),
  moderationRules: moderationRulesSchema.optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
}).strict();

router.put('/settings', requireAdminSession, validateBody(platformSettingsSchema), (req, res) => {
  try {
    const current = getPlatformSettings();
    const incoming = req.body || {};
    const next = setPlatformSettings({
      ...current,
      ...(incoming.platformName !== undefined ? { platformName: incoming.platformName } : {}),
      ...(incoming.maintenanceMode !== undefined ? { maintenanceMode: incoming.maintenanceMode } : {}),
      moderationRules: {
        ...(current?.moderationRules || {}),
        ...(incoming.moderationRules || {}),
      },
      notificationPreferences: {
        ...(current?.notificationPreferences || {}),
        ...(incoming.notificationPreferences || {}),
      },
    });
    res.json(next);
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour des parametres.' });
  }
});

// GET /activity-log
router.get('/activity-log', requireAdminSession, async (req, res) => {
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

// ==========================================
// 🚩 GESTION DES SIGNALEMENTS (REPORTS)
// ==========================================

const reportStatusSchema = z.object({
  status: z.enum(['OPEN', 'REVIEWED', 'CLOSED', 'REJECTED']),
});

router.get('/reports', requireAdminSession, async (req, res) => {
  try {
    const where = {};
    const status = String(req.query.status || '').trim().toUpperCase();
    if (status && ['OPEN', 'REVIEWED', 'CLOSED', 'REJECTED'].includes(status)) {
      where.status = status;
    }
    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('[Admin Reports Error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la recuperation des signalements.' });
  }
});

router.patch('/reports/:id/status', requireAdminSession, validateBody(reportStatusSchema), async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (!Number.isFinite(reportId) || reportId <= 0) {
      return res.status(400).json({ success: false, error: 'Identifiant signalement invalide.' });
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { status: req.body.status },
    });

    res.json({ success: true, data: updatedReport });
  } catch (error) {
    console.error('[Admin Update Report Error]', error);
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Signalement introuvable.' });
    }
    res.status(500).json({ success: false, error: 'Erreur lors de la mise a jour du signalement.' });
  }
});

// ==========================================
// 🛡️ GESTION DES VERIFICATIONS (KYC)
// ==========================================

const verificationStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'APPROVED', 'REJECTED', 'PENDING']),
  notes: z.string().trim().max(2000).optional(),
});

router.get('/verifications', requireAdminSession, async (req, res) => {
  try {
    const verifications = await prisma.verificationSubmission.findMany({
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ success: true, data: verifications });
  } catch (error) {
    console.error('[Admin Verifications Error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la recuperation des verifications.' });
  }
});

router.patch('/verifications/:id/status', requireAdminSession, validateBody(verificationStatusSchema), async (req, res) => {
  const id = String(req.params.id);
  const status = String(req.body.status || '').toLowerCase();
  const notes = req.body.notes ? String(req.body.notes).slice(0, 2000) : null;
  const reviewerId = req.sessionUser?.id ? String(req.sessionUser.id) : 'super-admin';

  try {
    const existing = await prisma.verificationSubmission.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Demande de verification non trouvee.' });
    }

    const updated = await prisma.verificationSubmission.update({
      where: { id },
      data: {
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        notes,
      },
    });

    if (status === 'approved') {
      const rawPayload = updated.payload || {};
      const maybeUserId = Number((typeof rawPayload === 'object' && rawPayload ? rawPayload.userId : null) || 0);
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
            `✅ Identite verifiee\nUser: ${userToVerify.name || userToVerify.email}\nRole: ${updated.role}`,
          ),
          sendAccountVerifiedEmail({ transporter, user: verifiedUser }),
        ]);
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Admin Update Verification Error]', error);
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Verification introuvable.' });
    }
    res.status(500).json({ success: false, error: 'Erreur lors de la mise a jour de la verification.' });
  }
});

// Admin inbox / emails
router.post('/emails', requireAdminSession, validateBody(adminCreateEmailTicketBodySchema), async (req, res) => {
  try {
    const { senderEmail, senderName, subject, body } = req.body;

    if (!senderEmail || !subject) {
      return res.status(400).json({ error: 'Email expediteur et sujet requis.' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        senderEmail: String(senderEmail),
        senderName: senderName ? String(senderName) : null,
        subject: String(subject),
        body: String(body),
        status: 'UNREAD'
      }
    });

    await sendWhatsAppModerationAlert(
      `Nouvel Email Pro\nDe: ${senderEmail}\nSujet: ${subject}`
    ).catch((err) => console.error('Erreur Twilio WhatsApp :', err.message));

    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error('POST /api/admin/emails error:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de l email.' });
  }
});

router.get('/emails', requireAdminSession, async (req, res) => {
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
    res.status(500).json({ error: 'Erreur lors de la recuperation des emails.' });
  }
});

router.get('/emails/summary', requireAdminSession, async (req, res) => {
  try {
    const force = req.query.force === '1' || req.query.force === 'true';
    const summary = await getAdminInboxSummary(prisma, {
      force,
      scope: req.query.view,
    });
    res.status(200).json(summary);
  } catch (error) {
    console.error('GET /api/admin/emails/summary error:', error);
    res.status(500).json({ error: 'Erreur lors de la recuperation du resume des emails.' });
  }
});

router.post('/emails/:ticketId/read', requireAdminSession, validateParams(adminTicketParamSchema), async (req, res) => {
  try {
    const item = await markAdminInboxTicketRead(prisma, req.params.ticketId);
    res.status(200).json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de mettre le message a jour.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|requis/i.test(message)
        ? 400
        : 500;

    console.error('POST /api/admin/emails/:ticketId/read error:', error);
    res.status(statusCode).json({ error: message });
  }
});

router.post('/emails/:ticketId/archive', requireAdminSession, validateParams(adminTicketParamSchema), async (req, res) => {
  try {
    const result = await archiveAdminInboxTicket(prisma, req.params.ticketId);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible d archiver le message.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|indisponible/i.test(message)
        ? 400
        : 500;

    console.error('POST /api/admin/emails/:ticketId/archive error:', error);
    res.status(statusCode).json({ error: message });
  }
});

router.post('/emails/:ticketId/trash', requireAdminSession, validateParams(adminTicketParamSchema), async (req, res) => {
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

router.get('/emails/:ticketId/attachments/:part/download', requireAdminSession, validateParams(adminAttachmentParamSchema), async (req, res) => {
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

router.post('/emails/reply', requireAdminSession, validateBody(adminReplyEmailBodySchema), async (req, res) => {
  try {
    const result = await replyToAdminInboxTicket(prisma, transporter, req.body);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible d envoyer la reponse.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|requis/i.test(message)
        ? 400
        : 500;

    console.error('Erreur envoi reponse:', error);
    res.status(statusCode).json({ error: message });
  }
});

module.exports = router;