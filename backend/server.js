require('dotenv').config();

const {
  Sentry,
  reportError,
  registerProcessErrorHandlers,
} = require('./lib/observability');
registerProcessErrorHandlers();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { ipKeyGenerator } = require('express-rate-limit');

const startJobArchiver = require('./cron/jobArchiver');
const { prisma, pool } = require('./lib/db');
const { isProduction, getPositiveIntegerEnv } = require('./lib/env');
const {
  getRequestIpKey,
  getRequestSourceIp,
} = require('./lib/security');
const { corsOptions } = require('./lib/cors');
const {
  SESSION_COOKIE_NAME,
  SESSION_JWT_SECRET,
  getSessionCookieOptions,
  getSessionCookieClearOptions,
  clearSessionCookie,
  createSessionToken,
  readSessionToken,
  requireAdminSession,
  requireUserSession,
} = require('./lib/session');
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
  twilioClient,
  sendWhatsAppModerationAlert,
  sendWhatsAppAlertToTargets,
  getInternalAlertWhatsAppTargets,
  sendOtpWithTwilio,
} = require('./lib/twilioService');
const {
  transporter,
  sendInternalAlertEmail,
  buildInternalAlertText,
  notifyPrivacyTeam,
} = require('./lib/emailService');
const { cloudinary, upload, ALLOWED_UPLOAD_MIME, uploadsRoot } = require('./lib/uploads');
const {
  parseDateOnlyFilter,
  buildDateRangeFilter,
  buildDateBuckets,
  toDayKey,
  formatShortDate,
  parsePositiveInt,
} = require('./lib/dates');
const {
  getPlatformSettings,
  setPlatformSettings,
  DEFAULT_NOTIFICATION_PREFERENCES,
} = require('./lib/settings');
const { createNotification, createAdminNotifications } = require('./lib/notifications');
const {
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
} = require('./lib/reports');
const {
  buildPrivacyReference,
  normalizePrivacyRequestKind,
  normalizePrivacyRequestStatus,
  normalizePrivacyNotes,
  createPrivacyRequestLog,
} = require('./lib/privacy');
const { profileFromBody, calcCvMajJours } = require('./lib/profiles');
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

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));
app.use('/api', apiGlobalLimiter);
app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(uploadsRoot));
app.use('/api/admin', requireAdminSession);

app.use('/api/feedbacks', require('./routes/feedbacks'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/privacy', require('./routes/privacy'));
app.use('/api/jobs', require('./routes/jobs'));

app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/users', require('./routes/users'));
app.use('/api/verifications', require('./routes/verifications'));
app.use('/api/admin', require('./routes/admin'));

// PATCH /api/notifications/:id/read — Marquer comme lue
app.patch('/api/notifications/:id/read', async (req, res) => {
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
app.patch('/api/users/:id/notifications/read-all', async (req, res) => {
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

// GET /api/users/:id/applications — Liste des candidatures envoyées par un candidat
app.get('/api/users/:id/applications', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const notifications = await prisma.notification.findMany({
      where: { userId, type: 'application_sent' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const applications = notifications.map((n) => {
      const data = (typeof n.data === 'object' && n.data !== null) ? n.data : {};
      return {
        id: n.id,
        jobId: data.jobId || null,
        jobTitle: data.jobTitle || '',
        company: data.company || '',
        date: n.createdAt,
        statut: 'Envoyee',
      };
    });

    res.json({ applications });
  } catch (error) {
    console.error('GET /api/users/:id/applications error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des candidatures.' });
  }
});

// =============================================
// ROUTES: App Feedbacks
// =============================================

app.post('/api/feedbacks', feedbackSubmissionLimiter, async (req, res) => {
  try {
    const { userId, authorName, rating, comment } = req.body || {};

    const parsedRating = parseInt(String(rating), 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'La note doit etre comprise entre 1 et 5.' });
    }

    const normalizedComment = String(comment || '').trim();
    if (normalizedComment.length < 3) {
      return res.status(400).json({ error: 'Commentaire trop court (minimum 3 caracteres).' });
    }

    const parsedUserId = userId ? parseInt(String(userId), 10) : null;
    if (userId && isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'userId invalide.' });
    }

    const row = await prisma.appFeedback.create({
      data: {
        userId: parsedUserId || null,
        authorName: authorName ? String(authorName).trim().slice(0, 120) : null,
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

app.post('/api/users/:id/reviews', reviewSubmissionLimiter, async (req, res) => {
  try {
    const reviewedId = parseInt(req.params.id, 10);
    if (isNaN(reviewedId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const { reviewerId, rating, comment } = req.body || {};
    const parsedReviewerId = parseInt(String(reviewerId), 10);
    const parsedRating = parseInt(String(rating), 10);

    if (isNaN(parsedReviewerId)) return res.status(400).json({ error: 'reviewerId invalide.' });
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

app.post('/api/privacy/delete-request', requireUserSession, privacyRequestLimiter, async (req, res) => {
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

// GET /api/reports — Liste des signalements
app.get('/api/reports', requireAdminSession, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = String(status);

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(reports);
  } catch (error) {
    console.error('GET /api/reports error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des signalements.' });
  }
});

// POST /api/reports — Créer un signalement
app.post('/api/reports', reportSubmissionLimiter, async (req, res) => {
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

// PUT /api/reports/:id — Modifier le statut d'un signalement
app.put('/api/reports/:id', requireAdminSession, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Statut requis.' });

    const report = await prisma.report.update({
      where: { id },
      data: { status: String(status) },
    });

    res.json(report);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Signalement non trouvé.' });
    console.error('PUT /api/reports/:id error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// =============================================
// ROUTES: Admin
// =============================================

// GET /api/admin/stats — Statistiques globales (enrichi)
app.get('/api/admin/stats', requireAdminSession, async (req, res) => {
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

// GET /api/admin/privacy-requests — Journal des demandes de confidentialite
app.get('/api/admin/privacy-requests', requireAdminSession, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
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

// PATCH /api/admin/privacy-requests/:reference — Suivi manuel d'une demande de confidentialite
app.patch('/api/admin/privacy-requests/:reference', requireAdminSession, async (req, res) => {
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

// GET /api/admin/reviews — All reviews with alert for low-rated users
app.get('/api/admin/reviews', requireAdminSession, async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(String(req.query.limit || '50'), 10) || 50);
    const reviews = await prisma.userReview.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reviewed: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Compute average per reviewed user to detect low-rated profiles
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

// GET /api/admin/users — User list with recent signups
app.get('/api/admin/users', requireAdminSession, async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(String(req.query.limit || '50'), 10) || 50);
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

// GET /api/admin/trends?days=7 — Tendances des inscriptions et publications
app.get('/api/admin/trends', requireAdminSession, async (req, res) => {
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

// GET /api/admin/banned-users — Liste des utilisateurs bannis
app.get('/api/admin/banned-users', requireAdminSession, async (req, res) => {
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

// POST /api/admin/notifications/broadcast — Envoyer une notification a tous ou par role
app.post('/api/admin/notifications/broadcast', requireAdminSession, async (req, res) => {
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

// GET /api/admin/notifications — Toutes les notifications (admin)
app.get('/api/admin/notifications', requireAdminSession, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
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

// GET /api/admin/me/notifications — Notifications internes du compte admin connecte
app.get('/api/admin/me/notifications', requireAdminSession, async (req, res) => {
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

// PATCH /api/admin/me/notifications/:id/read — Marquer une notification admin comme lue
app.patch('/api/admin/me/notifications/:id/read', requireAdminSession, async (req, res) => {
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

// PATCH /api/admin/me/notifications/read-all — Marquer toutes les notifications admin comme lues
app.patch('/api/admin/me/notifications/read-all', requireAdminSession, async (req, res) => {
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

// GET /api/admin/search?q=term — Recherche globale admin
app.get('/api/admin/search', requireAdminSession, async (req, res) => {
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

// GET /api/admin/settings — Parametres de la plateforme
app.get('/api/admin/settings', requireAdminSession, (_req, res) => {
  res.json(getPlatformSettings());
});

// PUT /api/admin/settings — Mettre a jour les parametres
app.put('/api/admin/settings', requireAdminSession, (req, res) => {
  try {
    const current = getPlatformSettings();
    const next = setPlatformSettings({
      ...current,
      ...(req.body && typeof req.body === 'object' ? req.body : {}),
      moderationRules: {
        ...current.moderationRules,
        ...(req.body?.moderationRules && typeof req.body.moderationRules === 'object' ? req.body.moderationRules : {}),
      },
      notificationPreferences: {
        ...current.notificationPreferences,
        ...(req.body?.notificationPreferences && typeof req.body.notificationPreferences === 'object' ? req.body.notificationPreferences : {}),
      },
    });
    res.json(next);
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour des parametres.' });
  }
});

// GET /api/admin/activity-log — Journal d activite recent
app.get('/api/admin/activity-log', requireAdminSession, async (req, res) => {
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

// =============================================
// ROUTES: Boite de Reception (Hostinger IMAP + legacy webhook)
// =============================================

app.post('/api/admin/emails', requireAdminSession, async (req, res) => {
  try {
    const { senderEmail, senderName, subject, body } = req.body;

    // 1. Vérification basique
    if (!senderEmail || !subject) {
      return res.status(400).json({ error: 'Email expéditeur et sujet requis.' });
    }

    // 2. Sauvegarde dans la base de données (Neon)
    const ticket = await prisma.supportTicket.create({
      data: {
        senderEmail: String(senderEmail),
        senderName: senderName ? String(senderName) : null,
        subject: String(subject),
        body: String(body),
        status: 'UNREAD'
      }
    });

    // 3. Le petit bonus CEO : Alerte WhatsApp immédiate !
    await sendWhatsAppModerationAlert(
      `📧 Nouvel Email Pro !\nDe: ${senderEmail}\nSujet: ${subject}`
    ).catch((err) => console.error("Erreur Twilio WhatsApp :", err.message));

    // 4. On répond à n8n que tout s'est bien passé
    res.status(201).json({ success: true, ticket });
    
  } catch (error) {
    console.error('POST /api/admin/emails error:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de l\'email.' });
  }
});

app.get('/api/admin/emails', requireAdminSession, async (req, res) => {
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
    res.status(500).json({ error: 'Erreur lors de la récupération des emails.' });
  }
});

app.get('/api/admin/emails/summary', requireAdminSession, async (req, res) => {
  try {
    const force = req.query.force === '1' || req.query.force === 'true';
    const summary = await getAdminInboxSummary(prisma, {
      force,
      scope: req.query.view,
    });
    res.status(200).json(summary);
  } catch (error) {
    console.error('GET /api/admin/emails/summary error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du résumé des emails.' });
  }
});

app.post('/api/admin/emails/:ticketId/read', requireAdminSession, async (req, res) => {
  try {
    const item = await markAdminInboxTicketRead(prisma, req.params.ticketId);
    res.status(200).json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de mettre le message à jour.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|requis/i.test(message)
        ? 400
        : 500;

    console.error('POST /api/admin/emails/:ticketId/read error:', error);
    res.status(statusCode).json({ error: message });
  }
});

app.post('/api/admin/emails/:ticketId/archive', requireAdminSession, async (req, res) => {
  try {
    const result = await archiveAdminInboxTicket(prisma, req.params.ticketId);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible d\'archiver le message.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|indisponible/i.test(message)
        ? 400
        : 500;

    console.error('POST /api/admin/emails/:ticketId/archive error:', error);
    res.status(statusCode).json({ error: message });
  }
});

app.post('/api/admin/emails/:ticketId/trash', requireAdminSession, async (req, res) => {
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

app.get('/api/admin/emails/:ticketId/attachments/:part/download', requireAdminSession, async (req, res) => {
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

// ROUTE: Repondre a un ticket
app.post('/api/admin/emails/reply', requireAdminSession, async (req, res) => {
  try {
    const result = await replyToAdminInboxTicket(prisma, transporter, req.body);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible d\'envoyer la reponse.';
    const statusCode = error?.code === 'NOT_FOUND'
      ? 404
      : /invalide|requis/i.test(message)
        ? 400
        : 500;

    console.error('Erreur envoi reponse:', error);
    res.status(statusCode).json({ error: message });
  }
});

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

// Démarrage des tâches automatisées
startJobArchiver(prisma);

// --- Start server ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`Backend Bolo237 en ligne !`);
  console.log(`Ecoute sur le port : ${PORT}`);
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
