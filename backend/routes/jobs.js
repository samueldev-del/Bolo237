const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { z } = require('zod');
const { prisma } = require('../lib/db');
const {
  cloudinary,
  upload,
  uploadsRoot,
  sniffFileType,
  safeExtensionForMime,
  ALLOWED_UPLOAD_MIME,
  withAvScan,
  isUploadMimeAllowedForFolder,
  buildUploadUrl,
  buildPrivateFileName,
  buildPrivateRemoteUploadUrl,
} = require('../lib/uploads');
const { readSessionToken, requireUserSession } = require('../lib/session');
const { isPublicHttpsUrl } = require('../lib/urlGuard');
const { createNotification } = require('../lib/notifications');
const { transporter } = require('../lib/emailService');
const { TranslationServiceError, buildBilingualJobContent } = require('../lib/translation.service');
const { generateJobReference } = require('../lib/references');
const { generateSlug } = require('../lib/jobSlug');
const { validateBody } = require('../lib/requestValidation');
const { jobApplicationLimiter, jobCreationLimiter } = require('../lib/limiters');

const PUBLIC_JOB_STATUSES = new Set(['APPROVED', 'ACTIVE']);
const PRIVATE_JOB_STATUSES = new Set(['PENDING', 'ACTIVE', 'APPROVED', 'REJECTED', 'CLOSED', 'ARCHIVED']);
const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);
const RECRUITER_ROLES = new Set(['ENTREPRISE', 'ARTISAN', 'ADMIN', 'SUPER_ADMIN']);
const CANDIDATE_ROLES = new Set(['CANDIDAT']);

function isAdminRole(role) {
  return ADMIN_ROLES.has(String(role || '').toUpperCase());
}

function isRecruiterRole(role) {
  return RECRUITER_ROLES.has(String(role || '').toUpperCase());
}

function isCandidateRole(role) {
  return CANDIDATE_ROLES.has(String(role || '').toUpperCase());
}

function buildPublicAuthorSelect() {
  return {
    id: true,
    name: true,
    role: true,
    isVerified: true,
    photoUrl: true,
  };
}

function normalizeStatusParam(status) {
  const normalized = String(status || '').trim().toUpperCase();
  return PRIVATE_JOB_STATUSES.has(normalized) ? normalized : null;
}

function canManagePrivateJob(sessionPayload, authorId) {
  const sessionUserId = Number(sessionPayload?.userId || 0);
  if (!Number.isFinite(sessionUserId) || sessionUserId <= 0) {
    return false;
  }

  return sessionUserId === Number(authorId) || isAdminRole(sessionPayload?.role);
}

function getRecruiterAccessError(sessionUser) {
  const role = String(sessionUser?.role || '').toUpperCase();
  if (!isRecruiterRole(role)) {
    return 'Seuls les comptes entreprise ou artisan peuvent publier et gerer des offres.';
  }

  if (!isAdminRole(role) && !sessionUser?.isVerified) {
    return 'Votre compte doit etre verifie avant de publier ou gerer des offres.';
  }

  return null;
}

async function ensureCandidateProfileReady(candidateId) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId: candidateId },
    select: {
      fullName: true,
      title: true,
      phone: true,
      email: true,
      profile: true,
      experience: true,
      education: true,
      skillsText: true,
    },
  });

  const missingFields = [];
  if (!String(profile?.fullName || '').trim()) missingFields.push('nom complet');
  if (!String(profile?.title || '').trim()) missingFields.push('titre');
  if (!String(profile?.phone || '').trim()) missingFields.push('telephone');
  if (!String(profile?.email || '').trim()) missingFields.push('email');

  const hasNarrative = Boolean(
    String(profile?.profile || '').trim() ||
    String(profile?.experience || '').trim() ||
    String(profile?.education || '').trim() ||
    String(profile?.skillsText || '').trim(),
  );

  if (!hasNarrative) {
    missingFields.push('resume ou competences');
  }

  return {
    ok: missingFields.length === 0,
    missingFields,
  };
}

async function getJobWithAuthor(jobId) {
  return prisma.job.findUnique({
    where: { id: jobId },
    include: {
      author: {
        select: buildPublicAuthorSelect(),
      },
    },
  });
}

const jobSchema = z.object({
  title: z.string().trim().min(5, 'Le titre doit faire au moins 5 caracteres').max(100),
  description: z.string().trim().min(50, 'La description doit etre detaillee (min 50 caracteres)'),
  location: z.string().trim().min(2, 'La localisation est requise'),
  company: z.string().trim().min(2, "Le nom de l'entreprise est requis").max(120).optional(),
  salary: z.string().optional().nullable(),
  externalApplyUrl: z
    .string()
    .trim()
    .url('URL de candidature externe invalide')
    .refine((value) => isPublicHttpsUrl(value), { message: 'URL externe non autorisee.' })
    .optional()
    .nullable(),
}).strict();

router.get('/', async (req, res) => {
  try {
    const { search, location, status, authorId, sort, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    const parsedAuthorId = authorId ? parseInt(authorId, 10) : null;
    const hasValidAuthorId = Number.isInteger(parsedAuthorId) && parsedAuthorId > 0;
    const sessionPayload = await readSessionToken(req);

    if (hasValidAuthorId) {
      where.authorId = parsedAuthorId;
    }

    const normalizedStatus = normalizeStatusParam(status);
    if (normalizedStatus && hasValidAuthorId && canManagePrivateJob(sessionPayload, parsedAuthorId)) {
      where.status = normalizedStatus;
    } else {
      where.status = { in: [...PUBLIC_JOB_STATUSES] };
    }

    const term = typeof search === 'string' ? search.trim() : '';
    if (term) {
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { titleFr: { contains: term, mode: 'insensitive' } },
        { titleEn: { contains: term, mode: 'insensitive' } },
        { title_fr: { contains: term, mode: 'insensitive' } },
        { title_en: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { descriptionFr: { contains: term, mode: 'insensitive' } },
        { descriptionEn: { contains: term, mode: 'insensitive' } },
        { description_fr: { contains: term, mode: 'insensitive' } },
        { description_en: { contains: term, mode: 'insensitive' } },
        { company: { contains: term, mode: 'insensitive' } },
      ];
    }

    const loc = typeof location === 'string' ? location.trim() : '';
    if (loc) {
      where.location = { contains: loc, mode: 'insensitive' };
    }

    const orderBy = sort === 'oldest'
      ? { createdAt: 'asc' }
      : { createdAt: 'desc' };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          author: {
            select: buildPublicAuthorSelect(),
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      success: true,
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Erreur liste jobs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ error: 'ID invalide.' });
    }

    const [job, sessionPayload] = await Promise.all([
      getJobWithAuthor(jobId),
      readSessionToken(req),
    ]);

    if (!job) {
      return res.status(404).json({ error: 'Offre non trouvee.' });
    }

    const canReadPrivateJob = canManagePrivateJob(sessionPayload, job.authorId);
    if (!PUBLIC_JOB_STATUSES.has(String(job.status || '').toUpperCase()) && !canReadPrivateJob) {
      return res.status(404).json({ error: 'Offre non trouvee.' });
    }

    return res.json(job);
  } catch (error) {
    console.error('GET /jobs/:id error:', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', requireUserSession, jobCreationLimiter, validateBody(jobSchema), async (req, res) => {
  try {
    const recruiterAccessError = getRecruiterAccessError(req.sessionUser);
    if (recruiterAccessError) {
      return res.status(403).json({ success: false, message: recruiterAccessError });
    }

    const {
      title,
      description,
      location,
      salary,
      company,
      externalApplyUrl,
    } = req.body;
    const authorId = req.sessionUser.id;
    const companyLabel = String(company || req.sessionUser.name || '').trim();
    const localizedFields = await buildBilingualJobContent({ title, description });

    if (!companyLabel) {
      return res.status(400).json({
        success: false,
        message: "Le nom de l'entreprise est requis pour publier l'offre.",
        errors: [{ champ: 'company', message: "Le nom de l'entreprise est requis." }],
      });
    }

    const newJob = await (async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const reference = generateJobReference();
          return await prisma.job.create({
            data: {
              reference,
              slug: generateSlug(localizedFields.title_fr, location, reference),
              title: localizedFields.title_fr,
              titleFr: localizedFields.titleFr,
              titleEn: localizedFields.titleEn,
              title_fr: localizedFields.title_fr,
              title_en: localizedFields.title_en,
              company: companyLabel,
              description: localizedFields.description_fr,
              descriptionFr: localizedFields.descriptionFr,
              descriptionEn: localizedFields.descriptionEn,
              description_fr: localizedFields.description_fr,
              description_en: localizedFields.description_en,
              location,
              salary,
              externalApplyUrl: externalApplyUrl ? String(externalApplyUrl).trim() : null,
              authorId,
              status: 'PENDING',
            },
          });
        } catch (err) {
          if (err?.code === 'P2002' && attempt < 4) {
            continue;
          }
          throw err;
        }
      }

      throw new Error('JOB_REFERENCE_GENERATION_FAILED');
    })();

    res.status(201).json({
      success: true,
      message: 'Offre soumise avec succes. En attente de validation.',
      job: newJob,
    });
  } catch (error) {
    if (error instanceof TranslationServiceError) {
      console.error('Erreur traduction creation job:', error);
      return res.status(502).json({
        success: false,
        message: 'Traduction automatique indisponible. Reessayez dans un instant.',
      });
    }

    console.error('Erreur creation job:', error);
    return res.status(500).json({ success: false, message: "Erreur interne lors de la creation de l'offre" });
  }
});

router.put('/:id', requireUserSession, validateBody(jobSchema), async (req, res) => {
  try {
    const recruiterAccessError = getRecruiterAccessError(req.sessionUser);
    if (recruiterAccessError) {
      return res.status(403).json({ success: false, message: recruiterAccessError });
    }

    const jobId = parseInt(req.params.id, 10);
    const userId = req.sessionUser.id;

    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: 'Offre invalide.' });
    }

    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        authorId: true,
        company: true,
        reference: true,
      },
    });

    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Offre introuvable.' });
    }

    if (existingJob.authorId !== userId && !isAdminRole(req.sessionUser.role)) {
      return res.status(403).json({ success: false, message: "Vous n'etes pas autorise a modifier cette offre." });
    }

    const {
      title,
      description,
      location,
      salary,
      company,
      externalApplyUrl,
    } = req.body;
    const companyLabel = String(company || existingJob.company || req.sessionUser.name || '').trim();
    const localizedFields = await buildBilingualJobContent({ title, description });

    if (!companyLabel) {
      return res.status(400).json({
        success: false,
        message: "Le nom de l'entreprise est requis pour modifier l'offre.",
        errors: [{ champ: 'company', message: "Le nom de l'entreprise est requis." }],
      });
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        slug: generateSlug(localizedFields.title_fr, location, existingJob.reference),
        title: localizedFields.title_fr,
        titleFr: localizedFields.titleFr,
        titleEn: localizedFields.titleEn,
        title_fr: localizedFields.title_fr,
        title_en: localizedFields.title_en,
        company: companyLabel,
        description: localizedFields.description_fr,
        descriptionFr: localizedFields.descriptionFr,
        descriptionEn: localizedFields.descriptionEn,
        description_fr: localizedFields.description_fr,
        description_en: localizedFields.description_en,
        location,
        salary,
        externalApplyUrl: externalApplyUrl ? String(externalApplyUrl).trim() : null,
      },
    });

    return res.json({
      success: true,
      message: 'Offre modifiee avec succes.',
      job: updatedJob,
    });
  } catch (error) {
    if (error instanceof TranslationServiceError) {
      console.error('Erreur traduction modification job:', error);
      return res.status(502).json({
        success: false,
        message: 'Traduction automatique indisponible. Reessayez dans un instant.',
      });
    }

    console.error('Erreur modification job:', error);
    return res.status(500).json({ success: false, message: "Erreur interne lors de la modification de l'offre." });
  }
});

router.delete('/:id', requireUserSession, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ error: 'ID invalide.' });
    }

    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, authorId: true },
    });

    if (!existingJob) {
      return res.status(404).json({ error: 'Offre non trouvee.' });
    }

    if (existingJob.authorId !== req.sessionUser.id && !isAdminRole(req.sessionUser.role)) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    await prisma.job.delete({ where: { id: jobId } });
    return res.json({ success: true, message: 'Offre supprimee.' });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Offre non trouvee.' });
    }

    console.error('DELETE /jobs/:id error:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

router.get('/:id/applications', requireUserSession, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const userId = req.sessionUser.id;
    const isAdmin = isAdminRole(req.sessionUser.role);

    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: 'Offre invalide.' });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { authorId: true },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Offre introuvable.' });
    }

    if (job.authorId !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: "Acces refuse. Vous n'etes pas l'auteur de cette offre." });
    }

    const applications = await prisma.application.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
    });

    return res.json({ success: true, applications });
  } catch (error) {
    console.error('Erreur recuperation candidatures:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur lors de la recuperation des candidatures.' });
  }
});

const applicationStatusSchema = z.object({
  status: z.enum(['REVIEWING', 'INTERVIEW', 'REJECTED', 'HIRED']),
});

router.post('/:id/view', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: 'ID annonce invalide.' });
    }

    const updated = await prisma.job.updateMany({
      where: {
        id: jobId,
        status: { in: [...PUBLIC_JOB_STATUSES] },
      },
      data: {
        viewCount: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({ success: false, message: 'Offre introuvable.' });
    }

    return res.status(202).json({ success: true });
  } catch (error) {
    console.error('Erreur tracking vue annonce:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur lors du tracking.' });
  }
});

router.post('/:id/apply-click', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: 'ID annonce invalide.' });
    }

    const updated = await prisma.job.updateMany({
      where: {
        id: jobId,
        status: { in: [...PUBLIC_JOB_STATUSES] },
      },
      data: {
        applyClickCount: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({ success: false, message: 'Offre introuvable.' });
    }

    return res.status(202).json({ success: true });
  } catch (error) {
    console.error('Erreur tracking clic candidature:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur lors du tracking.' });
  }
});

router.patch('/applications/:id/status', requireUserSession, async (req, res) => {
  try {
    const recruiterAccessError = getRecruiterAccessError(req.sessionUser);
    if (recruiterAccessError && !isAdminRole(req.sessionUser.role)) {
      return res.status(403).json({ success: false, message: recruiterAccessError });
    }

    const applicationId = parseInt(req.params.id, 10);
    if (!Number.isFinite(applicationId) || applicationId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de candidature invalide.' });
    }

    const parsed = await applicationStatusSchema.parseAsync(req.body);
    const recruiterId = req.sessionUser.id;
    const isAdmin = isAdminRole(req.sessionUser.role);

    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            authorId: true,
            company: true,
          },
        },
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!existingApplication) {
      return res.status(404).json({ success: false, message: 'Candidature introuvable.' });
    }

    if (existingApplication.job.authorId !== recruiterId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Acces refuse. Vous ne pouvez pas modifier cette candidature.' });
    }

    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: parsed.status,
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
    });

    const statusLabelMap = {
      APPLIED: 'Candidature envoyee',
      REVIEWING: 'En cours d etude',
      INTERVIEW: 'Entretien propose',
      REJECTED: 'Non retenue',
      HIRED: 'Retenu',
    };

    try {
      await createNotification({
        userId: existingApplication.candidate.id,
        type: 'application_status_updated',
        title: 'Mise a jour de votre candidature',
        message: `Votre candidature pour \"${existingApplication.job.title}\" est maintenant : ${statusLabelMap[parsed.status]}.`,
        data: {
          applicationId: existingApplication.id,
          jobId: existingApplication.job.id,
          jobTitle: existingApplication.job.title,
          status: parsed.status,
        },
      });
    } catch (notificationError) {
      console.warn('Notification candidat non envoyee (status update):', notificationError?.message || notificationError);
    }

    try {
      const candidateEmail = String(existingApplication.candidate?.email || '').trim();
      if (candidateEmail && candidateEmail.includes('@')) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: candidateEmail,
          subject: '[Bolo237] Mise a jour de candidature',
          text: `Bonjour ${existingApplication.candidate?.name || ''},\n\nVotre candidature pour \"${existingApplication.job.title}\" est maintenant : ${statusLabelMap[parsed.status]}.\n\nConnectez-vous a votre dashboard candidat pour suivre les details.\n\nBolo237`,
        });
      }
    } catch (emailError) {
      console.warn('Email candidat non envoye (status update):', emailError?.message || emailError);
    }

    return res.json({
      success: true,
      message: 'Statut de candidature mis a jour.',
      application: updatedApplication,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide.',
        errors: error.errors.map((err) => ({
          champ: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    console.error('Erreur mise a jour statut candidature:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur lors de la mise a jour du statut.' });
  }
});

// 🛡️ Schéma Zod pour la candidature.
// Anti-SSRF : cvUrl doit être une URL HTTPS publique (pas localhost ni RFC1918)
// pour empêcher le backend de pivoter vers des ressources internes.
const applySchema = z.object({
  message: z.string().trim().min(20, 'Votre message de motivation doit faire au moins 20 caracteres.').max(2000),
  cvUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => isPublicHttpsUrl(value), { message: 'URL CV non autorisee.' })
    .optional(),
});

const validateApply = async (req, res, next) => {
  try {
    req.body = await applySchema.parseAsync(req.body);

    if (!req.file && !req.body?.cvUrl) {
      return res.status(400).json({ success: false, message: 'Vous devez joindre un CV ou utiliser votre CV principal.' });
    }

    return next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Donnees de candidature invalides',
      errors: error.errors?.map((err) => err.message) || [error.message],
    });
  }
};

async function persistUploadedCv(file, req, ownerId) {
  const declaredMime = String(file.mimetype || '').toLowerCase();
  const detectedType = await sniffFileType(file.buffer, declaredMime);
  if (!detectedType || !isUploadMimeAllowedForFolder('cv', detectedType)) {
    throw new Error('INVALID_CV_TYPE');
  }

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    const folder = 'bolo237/cv';
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult)),
      );
      stream.end(file.buffer);
    });

    const remoteUrl = String(result?.secure_url || '').trim();
    if (!remoteUrl) {
      throw new Error('INVALID_CV_REMOTE_URL');
    }

    return buildPrivateRemoteUploadUrl(req, 'cv', ownerId, remoteUrl);
  }

  const extension = safeExtensionForMime(detectedType);
  const fileName = buildPrivateFileName(ownerId, extension);
  const targetDir = path.join(uploadsRoot, 'cv');
  if (!targetDir.startsWith(uploadsRoot + path.sep) && targetDir !== uploadsRoot) {
    throw new Error('INVALID_CV_FOLDER');
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, fileName), file.buffer);

  return buildUploadUrl(req, 'cv', fileName);
}

// ==========================================
// 🚀 ROUTE : POSTULER À UNE OFFRE
// ==========================================
// Ordre des middlewares :
// 1. Auth → 2. Rate-limit (avant I/O) → 3. Upload + scan antivirus → 4. Validation → 5. Logique.
router.post('/:id/apply', requireUserSession, jobApplicationLimiter, withAvScan(upload, 'cv'), validateApply, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const candidateId = req.sessionUser.id;
    const sessionRole = String(req.sessionUser?.role || '').toUpperCase();
    const { message, cvUrl: bodyCvUrl } = req.body;

    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: 'ID annonce invalide.' });
    }

    if (!isCandidateRole(sessionRole)) {
      return res.status(403).json({ success: false, message: 'Seuls les comptes candidats peuvent postuler a une offre.' });
    }

    const profileReadiness = await ensureCandidateProfileReady(candidateId);
    if (!profileReadiness.ok) {
      return res.status(400).json({
        success: false,
        message: `Votre profil candidat est incomplet : ${profileReadiness.missingFields.join(', ')}.`,
      });
    }

    const uploadedCvUrl = req.file ? await persistUploadedCv(req.file, req, candidateId) : '';
    const cvUrl = String(uploadedCvUrl || bodyCvUrl || '').trim();

    if (!cvUrl) {
      return res.status(400).json({ success: false, message: 'Vous devez joindre un CV valide.' });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        title: true,
        company: true,
        authorId: true,
      },
    });

    if (!job || !PUBLIC_JOB_STATUSES.has(String(job.status || '').toUpperCase())) {
      return res.status(404).json({ success: false, message: "Cette offre n'est plus disponible." });
    }

    if (job.authorId === candidateId) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas postuler a votre propre offre.' });
    }

    // Création atomique — la contrainte @@unique([jobId, candidateId]) garantit
    // l'unicité même en concurrence. On capte P2002 pour rendre le 409 idempotent.
    let application;
    try {
      application = await prisma.application.create({
        data: {
          jobId,
          candidateId,
          message,
          cvUrl,
          status: 'APPLIED',
        },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              photoUrl: true,
            },
          },
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Vous avez deja postule a cette offre.' });
      }
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Votre candidature a ete envoyee avec succes.',
      application,
    });
  } catch (error) {
    if (error?.message === 'INVALID_CV_TYPE') {
      return res.status(415).json({ success: false, message: 'Type de fichier reel invalide pour le CV.' });
    }
    if (error?.message === 'INVALID_CV_FOLDER') {
      return res.status(400).json({ success: false, message: 'Dossier de CV invalide.' });
    }
    if (error?.message === 'INVALID_CV_REMOTE_URL') {
      return res.status(502).json({ success: false, message: 'Le stockage du CV a echoue.' });
    }
    console.error('Erreur lors de la candidature:', error);
    return res.status(500).json({ success: false, message: "Erreur interne lors de l'envoi de la candidature." });
  }
});

module.exports = router;