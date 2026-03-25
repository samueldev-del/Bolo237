const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// --- Database setup ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();

const uploadsRoot = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Log Twilio status at startup
if (twilioClient) {
  console.log('✅ Twilio client initialized');
  if (process.env.TWILIO_WHATSAPP_FROM && process.env.TWILIO_WHATSAPP_TO) {
    console.log(`✅ WhatsApp alerts: FROM=${process.env.TWILIO_WHATSAPP_FROM} TO=${process.env.TWILIO_WHATSAPP_TO}`);
  } else {
    console.warn('⚠️ Twilio client OK but TWILIO_WHATSAPP_FROM or TWILIO_WHATSAPP_TO missing — WhatsApp alerts disabled');
  }
} else {
  console.warn('⚠️ Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing) — WhatsApp alerts disabled');
}

// Log Cloudinary status
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  console.log('✅ Cloudinary configured');
} else {
  console.warn('⚠️ Cloudinary not configured — file uploads will fail');
}

async function sendWhatsAppModerationAlert(messageBody) {
  if (!twilioClient) {
    console.log('📩 [WhatsApp SKIP - no client]', messageBody.split('\n')[0]);
    return;
  }
  if (!process.env.TWILIO_WHATSAPP_FROM || !process.env.TWILIO_WHATSAPP_TO) {
    console.log('📩 [WhatsApp SKIP - no FROM/TO]', messageBody.split('\n')[0]);
    return;
  }

  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.TWILIO_WHATSAPP_TO,
      body: messageBody,
    });
    console.log('📩 [WhatsApp SENT]', messageBody.split('\n')[0]);
  } catch (error) {
    console.error('📩 [WhatsApp ERROR]', error?.message || error);
  }
}

async function sendOtpWithTwilio(phone, code) {
  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
    return false;
  }

  const normalizedPhone = String(phone).startsWith('+') ? String(phone) : `+${String(phone).replace(/^\+/, '')}`;

  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalizedPhone,
      body: `Votre code Bolo237 est ${code}. Il expire dans 5 minutes.`,
    });
    console.log(`[OTP] SMS sent to ${normalizedPhone}`);
    return true;
  } catch (error) {
    console.error('[OTP] Twilio SMS error:', error?.message || error);
    return false;
  }
}

// --- Middleware ---
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://bolo237.com',
    'https://www.bolo237.com',
    'https://admin.bolo237.com',
    // Vercel preview URLs
    /https:\/\/bolo237(-[a-z0-9]+)?\.vercel\.app$/,
    /https:\/\/.*\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsRoot));

// Verification queue is persisted via Prisma VerificationSubmission model

// =============================================
// In-memory store: Admin platform settings
// =============================================
const SETTINGS_PATH = path.join(__dirname, 'admin-settings.json');
const DEFAULT_SETTINGS = {
  platformName: 'Bolo237',
  maintenanceMode: false,
  moderationRules: { autoApproveAfterPosts: 3, blockedKeywords: ['frais de dossier', 'transfert mobile money', 'investissement'] },
  notificationPreferences: { emailOnNewReport: true, whatsappOnNewJob: true }
};
let platformSettings = DEFAULT_SETTINGS;
try { platformSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) }; } catch { /* use defaults */ }

// candidateProfiles, userProfiles, savedJobs are now in the database (Prisma)

function profileFromBody(userId, body) {
  return {
    userId,
    fullName: String(body.fullName || ''),
    title: String(body.title || ''),
    location: String(body.location || ''),
    phone: String(body.phone || ''),
    email: String(body.email || ''),
    profile: String(body.profile || ''),
    experience: String(body.experience || ''),
    education: String(body.education || ''),
    skillsText: String(body.skillsText || ''),
    languagesText: String(body.languagesText || ''),
    updatedAt: new Date().toISOString(),
  };
}

function calcCvMajJours(createdAtIso) {
  const diff = Date.now() - new Date(createdAtIso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

async function createNotification({ userId, type, title, message, data }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data || undefined,
    },
  });
}

function buildDateBuckets(days) {
  const labels = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(d);
  }

  return labels;
}

function toDayKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(date, locale = 'fr-FR') {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
  });
}

// =============================================
// ROUTES: Jobs (Offres d'emploi)
// =============================================

// GET /api/jobs — Liste des offres (avec filtres optionnels)
app.get('/api/jobs', async (req, res) => {
  try {
    const { status, location, search, authorId, page = '1', limit = '20' } = req.query;

    const where = {};
    if (status) {
      const s = String(status);
      // Treat APPROVED and ACTIVE as equivalent for public listings
      if (s === 'APPROVED' || s === 'ACTIVE') {
        where.status = { in: ['APPROVED', 'ACTIVE'] };
      } else {
        where.status = s;
      }
    }
    if (authorId) {
      const parsedAuthorId = parseInt(String(authorId), 10);
      if (!isNaN(parsedAuthorId)) where.authorId = parsedAuthorId;
    }
    if (location) where.location = { contains: String(location), mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { company: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * take;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { author: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      jobs,
      pagination: { page: pageNum, limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error('GET /api/jobs error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des offres.' });
  }
});

// =============================================
// ROUTES: Verifications (Identite)
// =============================================

// GET /api/verifications — File complete des demandes
app.get('/api/verifications', async (_req, res) => {
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
app.get('/api/verifications/status', async (req, res) => {
  const { role, accountKey } = req.query;
  if (!role || !accountKey) {
    return res.status(400).json({ error: 'Parametres requis: role, accountKey.' });
  }

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
app.post('/api/verifications', async (req, res) => {
  try {
    const { role, accountKey, displayName, phone, payload } = req.body;

    if (!role || !accountKey || !displayName || !phone || !payload) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants: role, accountKey, displayName, phone, payload.',
      });
    }

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
    console.error('POST /api/verifications error:', error);
    res.status(500).json({ error: 'Erreur lors de la soumission de verification.' });
  }
});

// PATCH /api/verifications/:id/review — Decision super admin
app.patch('/api/verifications/:id/review', async (req, res) => {
  const id = String(req.params.id);
  const { status, reviewedBy, notes } = req.body;

  if (!status || !['approved', 'rejected'].includes(String(status))) {
    return res.status(400).json({ error: 'Statut invalide. Valeurs autorisees: approved, rejected.' });
  }

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
      // Try to find the user by payload.userId or by accountKey (email)
      const rawPayload = updated.payload || {};
      const maybeUserId = Number((typeof rawPayload === 'object' ? rawPayload.userId : null) || 0);
      let userToVerify = null;

      if (Number.isFinite(maybeUserId) && maybeUserId > 0) {
        userToVerify = await prisma.user.findUnique({ where: { id: maybeUserId } }).catch(() => null);
      }

      // Fallback: find by accountKey (email)
      if (!userToVerify && updated.accountKey) {
        userToVerify = await prisma.user.findUnique({ where: { email: updated.accountKey } }).catch(() => null);
      }

      if (userToVerify) {
        await prisma.user.update({
          where: { id: userToVerify.id },
          data: { isVerified: true },
        }).catch(() => null);

        await createNotification({
          userId: userToVerify.id,
          type: 'account_verified',
          title: 'Compte certifie',
          message: 'Felicitations ! Votre identite a ete verifiee. Vous avez maintenant le badge certifie sur votre profil.',
          data: { verificationId: updated.id, role: updated.role },
        }).catch(() => null);

        await sendWhatsAppModerationAlert(
          `✅ Identite verifiee\nUser: ${userToVerify.name || userToVerify.email}\nRole: ${updated.role}`
        ).catch(() => null);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/verifications/:id/review error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de la verification.' });
  }
});

// =============================================
// ROUTES: Candidate Profiles / CVtheque
// =============================================

app.get('/api/candidates', async (_req, res) => {
  try {
    const rows = await prisma.candidateProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const candidates = rows.map((c) => ({ ...c, cvMajJours: calcCvMajJours(c.createdAt) }));
    res.json({ candidates });
  } catch (error) {
    console.error('GET /api/candidates error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des candidats.' });
  }
});

app.post('/api/candidates', async (req, res) => {
  try {
    const {
      userId,
      nom,
      titre,
      localisation,
      experience = 'Confirme',
      disponibilite = 'Immediatement',
      etudes = 'Bac+3',
      competences = [],
      disponibleNow = true,
    } = req.body || {};

    if (!nom || !titre) {
      return res.status(400).json({ error: 'Champs requis: nom, titre.' });
    }

    const normalizedUserId = userId ? parseInt(String(userId), 10) : null;
    const data = {
      userId: normalizedUserId,
      nom: String(nom),
      titre: String(titre),
      localisation: String(localisation || 'Douala'),
      experience: String(experience),
      disponibilite: String(disponibilite),
      etudes: String(etudes),
      competences: Array.isArray(competences)
        ? competences.map((s) => String(s)).filter(Boolean).slice(0, 12)
        : [],
      disponibleNow: Boolean(disponibleNow),
    };

    const existing = normalizedUserId
      ? await prisma.candidateProfile.findFirst({ where: { userId: normalizedUserId } })
      : null;

    const item = existing
      ? await prisma.candidateProfile.update({ where: { id: existing.id }, data })
      : await prisma.candidateProfile.create({ data });

    await sendWhatsAppModerationAlert(
      [
        existing ? 'Profil candidat mis a jour' : 'Nouveau profil candidat cree',
        `ID: ${item.id}`,
        `Nom: ${item.nom}`,
        `Titre: ${item.titre}`,
        `Ville: ${item.localisation}`,
      ].join('\n')
    );

    res.status(existing ? 200 : 201).json({ ...item, cvMajJours: calcCvMajJours(item.createdAt) });
  } catch (error) {
    console.error('POST /api/candidates error:', error);
    res.status(500).json({ error: 'Erreur lors de la creation du profil candidat.' });
  }
});

app.get('/api/candidates/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID candidat invalide.' });

    const candidate = await prisma.candidateProfile.findUnique({ where: { id } });
    if (!candidate) return res.status(404).json({ error: 'Profil candidat non trouve.' });

    const [user, userProfile] = await Promise.all([
      candidate.userId
        ? prisma.user.findUnique({
            where: { id: candidate.userId },
            select: { id: true, name: true, email: true, phone: true, isVerified: true, createdAt: true },
          })
        : Promise.resolve(null),
      candidate.userId
        ? prisma.userProfile.findUnique({ where: { userId: candidate.userId } })
        : Promise.resolve(null),
    ]);

    res.json({
      id: candidate.id,
      userId: candidate.userId,
      nom: candidate.nom,
      titre: candidate.titre,
      localisation: candidate.localisation,
      experience: candidate.experience,
      disponibilite: candidate.disponibilite,
      etudes: candidate.etudes,
      competences: candidate.competences,
      disponibleNow: candidate.disponibleNow,
      cvMajJours: calcCvMajJours(candidate.createdAt),
      createdAt: candidate.createdAt,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
          }
        : null,
      profile: userProfile
        ? {
            fullName: userProfile.fullName,
            title: userProfile.title,
            location: userProfile.location,
            phone: userProfile.phone,
            email: userProfile.email,
            profile: userProfile.profile,
            experience: userProfile.experience,
            education: userProfile.education,
            skillsText: userProfile.skillsText,
            languagesText: userProfile.languagesText,
            updatedAt: userProfile.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('GET /api/candidates/:id error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du profil candidat.' });
  }
});

// =============================================
// ROUTES: User Profiles
// =============================================

app.get('/api/profiles/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const existing = await prisma.userProfile.findUnique({ where: { userId } });
    if (!existing) return res.status(404).json({ error: 'Profil non trouve.' });
    res.json(existing);
  } catch (error) {
    console.error('GET /api/profiles/:userId error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du profil.' });
  }
});

app.put('/api/profiles/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const data = profileFromBody(userId, req.body || {});
    delete data.userId;
    delete data.updatedAt;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    res.json(profile);
  } catch (error) {
    console.error('PUT /api/profiles/:userId error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour du profil.' });
  }
});

// =============================================
// ROUTES: Saved Jobs
// =============================================

app.get('/api/users/:id/saved-jobs', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID invalide.' });

    const savedEntries = await prisma.savedJob.findMany({ where: { userId } });
    const ids = savedEntries.map((s) => s.jobId);
    if (ids.length === 0) return res.json({ jobs: [] });

    const jobs = await prisma.job.findMany({
      where: { id: { in: ids } },
      include: { author: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ jobs });
  } catch (error) {
    console.error('GET /api/users/:id/saved-jobs error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des annonces sauvegardees.' });
  }
});

app.post('/api/users/:id/saved-jobs', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const jobId = parseInt(String(req.body?.jobId), 10);

    if (isNaN(userId) || isNaN(jobId)) {
      return res.status(400).json({ error: 'Parametres invalides: userId et jobId requis.' });
    }

    await prisma.savedJob.upsert({
      where: { userId_jobId: { userId, jobId } },
      update: {},
      create: { userId, jobId },
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('POST /api/users/:id/saved-jobs error:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
  }
});

app.delete('/api/users/:id/saved-jobs/:jobId', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const jobId = parseInt(req.params.jobId, 10);

    if (isNaN(userId) || isNaN(jobId)) {
      return res.status(400).json({ error: 'Parametres invalides: userId et jobId requis.' });
    }

    await prisma.savedJob.deleteMany({ where: { userId, jobId } });
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/users/:id/saved-jobs error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// GET /api/jobs/:id — Détail d'une offre
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const job = await prisma.job.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, email: true, role: true } } },
    });

    if (!job) return res.status(404).json({ error: 'Offre non trouvée.' });
    res.json(job);
  } catch (error) {
    console.error('GET /api/jobs/:id error:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/jobs/:id/apply — Simuler une candidature et notifier l'entreprise
app.post('/api/jobs/:id/apply', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (isNaN(jobId)) return res.status(400).json({ error: 'ID annonce invalide.' });

    const { candidateId, candidateName } = req.body || {};
    if (!candidateId) {
      return res.status(400).json({ error: 'candidateId requis.' });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, company: true, authorId: true },
    });

    if (!job) return res.status(404).json({ error: 'Offre non trouvee.' });

    const normalizedCandidateId = parseInt(String(candidateId), 10);
    if (isNaN(normalizedCandidateId)) {
      return res.status(400).json({ error: 'candidateId invalide.' });
    }

    const [user, userProfile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: normalizedCandidateId },
        select: { id: true, name: true, email: true, phone: true, isVerified: true },
      }),
      prisma.userProfile.findUnique({ where: { userId: normalizedCandidateId } }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'Candidat introuvable.' });
    }

    const profileReady = Boolean(
      userProfile?.fullName &&
      userProfile?.title &&
      userProfile?.phone &&
      userProfile?.email &&
      (userProfile?.skillsText || userProfile?.experience || userProfile?.education)
    );

    if (!profileReady) {
      return res.status(400).json({ error: 'Le dossier candidat est incomplet. Completez le profil avant de postuler.' });
    }

    const candidateLabel = String(candidateName || user.name || user.email || `Candidat #${normalizedCandidateId}`);

    // Notify the enterprise (job author)
    const notif = await createNotification({
      userId: job.authorId,
      type: 'application_received',
      title: 'Nouvelle candidature',
      message: `${candidateLabel} a postule a votre offre: ${job.title}`,
      data: {
        jobId: job.id,
        candidateId: normalizedCandidateId,
        candidateName: candidateLabel,
      },
    });

    // Notify the candidate (confirmation)
    await createNotification({
      userId: normalizedCandidateId,
      type: 'application_sent',
      title: 'Candidature envoyee',
      message: `Votre candidature pour "${job.title}" chez ${job.company} a ete envoyee.`,
      data: {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
      },
    });

    res.status(201).json({ ok: true, notification: notif });
  } catch (error) {
    console.error('POST /api/jobs/:id/apply error:', error);
    res.status(500).json({ error: 'Erreur lors de la candidature.' });
  }
});

// POST /api/jobs — Créer une offre
app.post('/api/jobs', async (req, res) => {
  try {
    const { title, company, location, description, salary, authorId } = req.body;

    if (!title || !company || !location || !description || !authorId) {
      return res.status(400).json({ error: 'Champs obligatoires manquants: title, company, location, description, authorId.' });
    }

    const job = await prisma.job.create({
      data: {
        title: String(title),
        company: String(company),
        location: String(location),
        description: String(description),
        salary: salary ? String(salary) : null,
        authorId: parseInt(String(authorId), 10),
        status: 'PENDING',
      },
    });

    await sendWhatsAppModerationAlert(
      [
        'Nouvelle annonce en attente de moderation',
        `ID: ${job.id}`,
        `Titre: ${job.title}`,
        `Entreprise: ${job.company}`,
        `Lieu: ${job.location}`,
      ].join('\n')
    );

    res.status(201).json(job);
  } catch (error) {
    console.error('POST /api/jobs error:', error);
    res.status(500).json({ error: "Erreur lors de la création de l'offre." });
  }
});

// PUT /api/jobs/:id — Modifier une offre
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const { title, company, location, description, salary, status } = req.body;

    const allowedStatuses = ['PENDING', 'ACTIVE', 'APPROVED', 'REJECTED', 'CLOSED'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs autorisees: ${allowedStatuses.join(', ')}` });
    }

    const data = {};
    if (title !== undefined) data.title = String(title);
    if (company !== undefined) data.company = String(company);
    if (location !== undefined) data.location = String(location);
    if (description !== undefined) data.description = String(description);
    if (salary !== undefined) data.salary = salary ? String(salary) : null;
    if (status !== undefined) data.status = String(status);

    const job = await prisma.job.update({ where: { id }, data });

    // After the job is updated, check if status changed and notify author
    if (status && (status === 'APPROVED' || status === 'ACTIVE' || status === 'REJECTED')) {
      const updatedJob = await prisma.job.findUnique({ where: { id }, select: { authorId: true, title: true } });
      if (updatedJob) {
        const statusLabel = (status === 'APPROVED' || status === 'ACTIVE') ? 'approuvee' : 'rejetee';
        await createNotification({
          userId: updatedJob.authorId,
          type: 'job_status_changed',
          title: status === 'REJECTED' ? 'Offre rejetee' : 'Offre approuvee',
          message: `Votre offre "${updatedJob.title}" a ete ${statusLabel} par l'equipe de moderation.`,
          data: { jobId: id, status },
        });
      }
    }

    res.json(job);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Offre non trouvée.' });
    console.error('PUT /api/jobs/:id error:', error);
    res.status(500).json({ error: "Erreur lors de la mise à jour." });
  }
});

// DELETE /api/jobs/:id — Supprimer une offre
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    await prisma.job.delete({ where: { id } });
    res.json({ message: 'Offre supprimée.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Offre non trouvée.' });
    console.error('DELETE /api/jobs/:id error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// =============================================
// ROUTES: Users
// =============================================

// GET /api/users — Liste des utilisateurs
app.get('/api/users', async (req, res) => {
  try {
    const { role, page = '1', limit = '20' } = req.query;

    const where = {};
    if (role) where.role = String(role);

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * take;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: { id: true, email: true, name: true, role: true, isVerified: true, isBanned: true, banReason: true, bannedAt: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: { page: pageNum, limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des utilisateurs.' });
  }
});

// GET /api/users/:id — Détail d'un utilisateur
app.get('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isVerified: true, isBanned: true, banReason: true, bannedAt: true, createdAt: true, jobs: true },
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.json(user);
  } catch (error) {
    console.error('GET /api/users/:id error:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/users — Créer un utilisateur
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, name, role, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: String(email) } });
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

    const hashedPassword = bcrypt.hashSync(String(password), 10);

    const user = await prisma.user.create({
      data: {
        email: String(email),
        password: hashedPassword,
        name: name ? String(name) : null,
        role: role ? String(role) : 'CANDIDAT',
        phone: phone ? String(phone) : null,
        isVerified: false,
      },
      select: { id: true, email: true, name: true, role: true, phone: true, isVerified: true, isBanned: true, createdAt: true },
    });

    console.log(`✅ Nouveau user créé: ID=${user.id} Role=${user.role} Email=${user.email}`);

    await sendWhatsAppModerationAlert(
      [
        '🆕 Nouveau profil en attente de vérification',
        `👤 ${user.name || '-'}`,
        `📧 ${user.email}`,
        `🏷️ ${user.role}`,
        `🔗 ID: ${user.id}`,
      ].join('\n')
    );

    res.status(201).json({
      ...user,
      moderationStatus: 'PENDING',
    });
  } catch (error) {
    console.error('POST /api/users error:', error);
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur." });
  }
});

// PUT /api/users/:id — Modifier un utilisateur (role, verification, etc.)
app.put('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const { name, role, isVerified } = req.body;
    const data = {};
    if (name !== undefined) data.name = String(name);
    if (role !== undefined) data.role = String(role);
    if (isVerified !== undefined) data.isVerified = Boolean(isVerified);

    console.log(`PUT /api/users/${id} — updating:`, JSON.stringify(data));

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isVerified: true, isBanned: true, banReason: true, bannedAt: true, createdAt: true },
    });

    console.log(`PUT /api/users/${id} — result: isVerified=${user.isVerified}`);

    // Envoyer une notification WhatsApp lors de la vérification
    if (isVerified === true) {
      await sendWhatsAppModerationAlert(
        `✅ Compte vérifié\nUser ID: ${user.id}\nNom: ${user.name || '-'}\nRole: ${user.role}`
      );

      await createNotification({
        userId: id,
        type: 'account_verified',
        title: 'Compte verifie',
        message: 'Votre compte a ete verifie avec succes. Vous pouvez maintenant acceder a toutes les fonctionnalites.',
        data: {},
      });
    }

    res.json(user);
  } catch (error) {
    console.error('PUT /api/users/:id error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// PUT /api/users/:id/ban — Bannir ou débannir un utilisateur
app.put('/api/users/:id/ban', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const { banned, reason } = req.body;
    const isBanned = Boolean(banned);

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned,
        bannedAt: isBanned ? new Date() : null,
        banReason: isBanned ? (reason ? String(reason) : 'Banni par l administrateur') : null,
      },
      select: { id: true, email: true, name: true, role: true, isVerified: true, isBanned: true, banReason: true, bannedAt: true, createdAt: true },
    });

    res.json(user);
  } catch (error) {
    console.error('PUT /api/users/:id/ban error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.status(500).json({ error: 'Erreur lors du bannissement.' });
  }
});

// DELETE /api/users/:id — Supprimer un utilisateur et ses annonces
app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    // Supprimer d'abord les jobs liés (contrainte FK)
    await prisma.job.deleteMany({ where: { authorId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ ok: true, message: 'Utilisateur et ses annonces supprimés.' });
  } catch (error) {
    console.error('DELETE /api/users/:id error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// =============================================
// ROUTES: Notifications
// =============================================

// GET /api/users/:id/notifications — Liste notifications + unreadCount
app.get('/api/users/:id/notifications', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide.' });

    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';

    const where = unreadOnly ? { userId, isRead: false } : { userId };

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({ items, unreadCount });
  } catch (error) {
    console.error('GET /api/users/:id/notifications error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des notifications.' });
  }
});

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

app.post('/api/feedbacks', async (req, res) => {
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
    console.error('POST /api/feedbacks error:', error);
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

app.post('/api/users/:id/reviews', async (req, res) => {
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
    console.error('POST /api/users/:id/reviews error:', error);
    res.status(500).json({ error: 'Erreur lors de la creation de lavis.' });
  }
});

// =============================================
// ROUTES: Auth (Authentification)
// =============================================

// POST /api/auth/login — Connexion utilisateur
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const user = await prisma.user.findUnique({ where: { email: String(email) } });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const valid = bcrypt.compareSync(String(password), user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Compte banni.', reason: user.banReason });
    }

    // Return user data without password
    const { password: _pw, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

// =============================================
// ROUTES: Reports (Signalements)
// =============================================

// GET /api/reports — Liste des signalements
app.get('/api/reports', async (req, res) => {
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
app.post('/api/reports', async (req, res) => {
  try {
    const { reason, targetType, targetId } = req.body;

    if (!reason || !targetType || !targetId) {
      return res.status(400).json({ error: 'Champs obligatoires: reason, targetType, targetId.' });
    }

    const report = await prisma.report.create({
      data: {
        reason: String(reason),
        targetType: String(targetType),
        targetId: parseInt(String(targetId), 10),
        status: 'OPEN',
      },
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('POST /api/reports error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du signalement.' });
  }
});

// PUT /api/reports/:id — Modifier le statut d'un signalement
app.put('/api/reports/:id', async (req, res) => {
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
app.get('/api/admin/stats', async (req, res) => {
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

// GET /api/admin/reviews — All reviews with alert for low-rated users
app.get('/api/admin/reviews', async (req, res) => {
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
app.get('/api/admin/users', async (req, res) => {
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
app.get('/api/admin/trends', async (req, res) => {
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
app.get('/api/admin/banned-users', async (req, res) => {
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
app.post('/api/admin/notifications/broadcast', async (req, res) => {
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
app.get('/api/admin/notifications', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.notification.count(),
    ]);

    res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('GET /api/admin/notifications error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des notifications.' });
  }
});

// GET /api/admin/search?q=term — Recherche globale admin
app.get('/api/admin/search', async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';
    if (!q) return res.json({ users: [], jobs: [] });

    const [users, jobs] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.job.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
          ],
        },
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
app.get('/api/admin/settings', (_req, res) => {
  res.json(platformSettings);
});

// PUT /api/admin/settings — Mettre a jour les parametres
app.put('/api/admin/settings', (req, res) => {
  try {
    platformSettings = { ...platformSettings, ...req.body };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(platformSettings, null, 2), 'utf8');
    res.json(platformSettings);
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour des parametres.' });
  }
});

// GET /api/admin/activity-log — Journal d activite recent
app.get('/api/admin/activity-log', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));

    const [recentUsers, recentJobs, recentReports, recentBans] = await Promise.all([
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

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ events: events.slice(0, limit) });
  } catch (error) {
    console.error('GET /api/admin/activity-log error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du journal d activite.' });
  }
});

// =============================================
// ROUTES: File Upload (Cloudinary)
// =============================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const safeFolder = String(req.query.folder || 'general').replace(/[^a-zA-Z0-9/_-]/g, '') || 'general';

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const folder = `bolo237/${safeFolder}`;

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'auto' },
          (error, uploadResult) => error ? reject(error) : resolve(uploadResult)
        );
        stream.end(req.file.buffer);
      });

      return res.json({ url: result.secure_url, publicId: result.public_id });
    }

    const extension = path.extname(req.file.originalname || '') || '';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
    const targetDir = path.join(uploadsRoot, safeFolder);
    fs.mkdirSync(targetDir, { recursive: true });

    const fullPath = path.join(targetDir, fileName);
    fs.writeFileSync(fullPath, req.file.buffer);

    const relativePath = `${safeFolder}/${fileName}`.replace(/\\/g, '/');
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({ url: `${baseUrl}/uploads/${relativePath}`, publicId: relativePath });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// =============================================
// ROUTES: OTP (Verification telephone)
// =============================================

// Stockage en memoire des codes OTP (en prod : Redis ou DB)
const otpStore = new Map(); // phone -> { code, expires }

// Route pour ENVOYER le code SMS
app.post('/api/otp/send', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Numéro de téléphone requis" });

  // 1. Générer un vrai code à 6 chiffres
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Sauvegarder en mémoire (expire dans 5 minutes)
  otpStore.set(phone, { code: otp, expires: Date.now() + 5 * 60000 });

  try {
    // 3. Envoyer le vrai SMS via Twilio
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        body: `Bienvenue sur Bolo237 ! Votre code de vérification est : ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`✅ SMS envoyé avec succès à ${phone}`);
    } else {
      console.warn(`⚠️ Twilio non configuré pour les SMS. Code généré en local : ${otp}`);
    }
    
    res.json({ success: true, message: "Code envoyé par SMS" });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi du SMS Twilio:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi du SMS. Veuillez réessayer." });
  }
});

// Route pour VÉRIFIER le code SMS
app.post('/api/otp/verify', async (req, res) => {
  const { phone, code } = req.body;
  
  // Le Master Code (0000 ou 000000) pour qu'Apple/Google puissent tester l'app plus tard
  const masterCode = process.env.MASTER_OTP || "000000";
  if (code === masterCode) {
    return res.json({ success: true, verified: true, message: "Code Master accepté" });
  }

  const record = otpStore.get(phone);
  if (!record) return res.status(400).json({ error: "Aucun code demandé pour ce numéro" });
  if (Date.now() > record.expires) {
    otpStore.delete(phone);
    return res.status(400).json({ error: "Le code a expiré (5 minutes max)" });
  }
  if (record.code !== code) {
    return res.status(400).json({ error: "Code incorrect" });
  }

  // Si c'est bon, on supprime le code pour la sécurité
  otpStore.delete(phone);
  res.json({ success: true, verified: true, message: "Téléphone vérifié avec succès" });
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
