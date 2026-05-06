const express = require('express');
const crypto = require('crypto');
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
} = require('../lib/uploads');
const { readSessionToken, requireUserSession } = require('../lib/session');
const { createNotification } = require('../lib/notifications');
const { transporter } = require('../lib/emailService');
const { TranslationServiceError, buildBilingualJobContent } = require('../lib/translation.service');
const { generateJobReference } = require('../lib/references');
const { generateSlug } = require('../lib/jobSlug');
const { validateBody } = require('../lib/requestValidation');

// 🛡️ 1. LE SCHÉMA ZOD : Le plan strict de ce qu'on accepte
const jobSchema = z.object({
  title: z.string().trim().min(5, "Le titre doit faire au moins 5 caractères").max(100),
  description: z.string().trim().min(50, "La description doit être détaillée (min 50 caractères)"),
  location: z.string().trim().min(2, "La localisation est requise"),
  company: z.string().trim().min(2, "Le nom de l'entreprise est requis").max(120).optional(),
  salary: z.string().optional().nullable(),
  externalApplyUrl: z.string().trim().url("URL de candidature externe invalide").optional().nullable(),
}).strict();

// ==========================================
// 🚀 LES ROUTES
// ==========================================

// GET /jobs (Liste + Recherche)
router.get('/', async (req, res) => {
  try {
    const { search, location, status, authorId, sort, page, limit } = req.query;

    // ── Pagination ───────────────────────────────────────────────
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip     = (pageNum - 1) * limitNum;

    // ── WHERE clause ─────────────────────────────────────────────
    const where = {};

    // Filtrage status prive uniquement pour l'auteur connecte.
    const ALLOWED = ['PENDING', 'ACTIVE', 'APPROVED', 'REJECTED', 'CLOSED', 'ARCHIVED'];
    const parsedAuthorId = authorId ? parseInt(authorId, 10) : null;
    const hasValidAuthorId = Number.isInteger(parsedAuthorId) && parsedAuthorId > 0;

    if (hasValidAuthorId) {
      where.authorId = parsedAuthorId;
    }

    let canUsePrivateStatusFilter = false;
    if (hasValidAuthorId) {
      const sessionPayload = await readSessionToken(req);
      canUsePrivateStatusFilter = Number(sessionPayload?.userId) === parsedAuthorId;
    }

    if (canUsePrivateStatusFilter) {
      if (status && ALLOWED.includes(status)) {
        where.status = status;
      }
    } else {
      const normalizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';

      // Route publique: seules les annonces visibles restent exposées.
      where.status = { in: ['APPROVED', 'ACTIVE'] };
    }

    // Recherche plein-texte (insensible à la casse) sur titre, description, entreprise
    const term = typeof search === 'string' ? search.trim() : '';
    if (term) {
      where.OR = [
        { title:       { contains: term, mode: 'insensitive' } },
        { titleFr:     { contains: term, mode: 'insensitive' } },
        { titleEn:     { contains: term, mode: 'insensitive' } },
        { title_fr:    { contains: term, mode: 'insensitive' } },
        { title_en:    { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { descriptionFr: { contains: term, mode: 'insensitive' } },
        { descriptionEn: { contains: term, mode: 'insensitive' } },
        { description_fr: { contains: term, mode: 'insensitive' } },
        { description_en: { contains: term, mode: 'insensitive' } },
        { company:     { contains: term, mode: 'insensitive' } },
      ];
    }

    // Filtre lieu (insensible à la casse)
    const loc = typeof location === 'string' ? location.trim() : '';
    if (loc) {
      where.location = { contains: loc, mode: 'insensitive' };
    }

    // ── Tri ───────────────────────────────────────────────────────
    const orderBy = sort === 'oldest'
      ? { createdAt: 'asc' }
      : { createdAt: 'desc' };

    // ── Requête ───────────────────────────────────────────────────
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          author: {
            select: { photoUrl: true, isVerified: true },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      success: true,
      jobs,
      pagination: {
        page:  pageNum,
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

// POST /jobs (Création avec validation Zod)
// On place `validateRequest(jobSchema)` AVANT la logique de création
router.post('/', requireUserSession, validateBody(jobSchema), async (req, res) => {
  try {
    // Si on arrive ici, req.body est 100% garanti valide grâce à Zod !
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
      for (let attempt = 0; attempt < 5; attempt++) {
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
              status: 'PENDING', // Toujours en attente pour modération admin
            }
          });
        } catch (err) {
          // P2002 = violation contrainte unique (collision de référence, très rare)
          if (err?.code === 'P2002' && attempt < 4) continue;
          throw err;
        }
      }
    })();

    res.status(201).json({ 
      success: true, 
      message: "Offre soumise avec succès. En attente de validation.",
      job: newJob 
    });

  } catch (error) {
    if (error instanceof TranslationServiceError) {
      console.error('Erreur traduction creation job:', error);
      return res.status(502).json({
        success: false,
        message: "Traduction automatique indisponible. Réessayez dans un instant.",
      });
    }

    console.error("Erreur création job:", error);
    res.status(500).json({ success: false, message: "Erreur interne lors de la création de l'offre" });
  }
});

// PUT /jobs/:id (Modification avec validation Zod)
router.put('/:id', requireUserSession, validateBody(jobSchema), async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const userId = req.sessionUser.id;

    // 1. Vérifier que l'offre existe
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!existingJob) {
      return res.status(404).json({ success: false, message: "Offre introuvable." });
    }

    // 🛡️ SÉCURITÉ : Vérifier que l'utilisateur connecté est bien le propriétaire de l'offre
    // (Ajuste "authorId" si ta colonne s'appelle différemment dans schema.prisma)
    if (existingJob.authorId !== userId) {
      return res.status(403).json({ success: false, message: "Vous n'êtes pas autorisé à modifier cette offre." });
    }

    // 2. Si on arrive ici, req.body est validé par Zod ET l'utilisateur est le bon
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
        // Tu peux choisir de repasser le statut en 'PENDING' si tu veux remodérer les offres modifiées
        // status: 'PENDING'
      }
    });

    res.json({
      success: true,
      message: "Offre modifiée avec succès.",
      job: updatedJob
    });

  } catch (error) {
    if (error instanceof TranslationServiceError) {
      console.error('Erreur traduction modification job:', error);
      return res.status(502).json({
        success: false,
        message: "Traduction automatique indisponible. Réessayez dans un instant.",
      });
    }

    console.error("Erreur modification job:", error);
    res.status(500).json({ success: false, message: "Erreur interne lors de la modification de l'offre." });
  }
});

// 📦 GET /jobs/:id/applications (Récupérer les candidatures d'une offre)
router.get('/:id/applications', requireUserSession, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const userId = req.sessionUser.id;

    // 1. Vérifier que l'offre existe ET appartient à l'utilisateur connecté
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { authorId: true }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Offre introuvable.' });
    }

    if (job.authorId !== userId) {
      return res.status(403).json({ success: false, message: "Acces refuse. Vous n'etes pas l'auteur de cette offre." });
    }

    // 2. Récupérer les candidatures avec les infos du candidat
    const applications = await prisma.application.findMany({
      where: { jobId: jobId },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true
          }
        }
      }
    });

    res.json({ success: true, applications });
  } catch (error) {
    console.error('Erreur recuperation candidatures:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la recuperation des candidatures.' });
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
        status: { in: ['APPROVED', 'ACTIVE'] },
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
        status: { in: ['APPROVED', 'ACTIVE'] },
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

// PATCH /jobs/applications/:id/status (Changer le statut d'une candidature)
router.patch('/applications/:id/status', requireUserSession, async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);
    if (!Number.isFinite(applicationId) || applicationId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de candidature invalide.' });
    }

    const parsed = await applicationStatusSchema.parseAsync(req.body);
    const recruiterId = req.sessionUser.id;

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

    if (existingApplication.job.authorId !== recruiterId) {
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

// 🛡️ 1. LE SCHÉMA ZOD POUR LA CANDIDATURE
const applySchema = z.object({
  message: z.string().trim().min(20, "Votre message de motivation doit faire au moins 20 caractères.").max(2000),
  cvUrl: z.string().trim().url().optional(),
});

// 🛑 2. MIDDLEWARE DE VALIDATION POUR LES FORMULAIRES MULTIPART (fichiers)
// (Légèrement différent du précédent car 'multer' met les textes dans req.body et le fichier dans req.file)
const validateApply = async (req, res, next) => {
  try {
    req.body = await applySchema.parseAsync(req.body);

    // Accepter soit un fichier, soit une URL de CV principal deja stockee.
    if (!req.file && !req.body?.cvUrl) {
      return res.status(400).json({ success: false, message: "Vous devez joindre un CV ou utiliser votre CV principal." });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Données de candidature invalides",
      errors: error.errors?.map(err => err.message) || [error.message]
    });
  }
};

async function persistUploadedCv(file, req) {
  const declaredMime = String(file.mimetype || '').toLowerCase();
  const detectedType = await sniffFileType(file.buffer, declaredMime);
  if (!detectedType || !ALLOWED_UPLOAD_MIME.has(detectedType)) {
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

    return String(result.secure_url || '').trim();
  }

  const extension = safeExtensionForMime(detectedType);
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
  const targetDir = path.join(uploadsRoot, 'cv');
  if (!targetDir.startsWith(uploadsRoot + path.sep) && targetDir !== uploadsRoot) {
    throw new Error('INVALID_CV_FOLDER');
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, fileName), file.buffer);

  const relativePath = `cv/${fileName}`.replace(/\\/g, '/');
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${relativePath}`;
}

// ==========================================
// 🚀 ROUTE : POSTULER À UNE OFFRE
// ==========================================

// L'ordre des middlewares est crucial :
// 1. Authentification -> 2. Upload du fichier -> 3. Validation Zod -> 4. Logique métier
router.post('/:id/apply', requireUserSession, upload.single('cv'), validateApply, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const candidateId = req.sessionUser.id;
    const { message, cvUrl: bodyCvUrl } = req.body;

    const uploadedCvUrl = req.file ? await persistUploadedCv(req.file, req) : '';
    const cvUrl = String(uploadedCvUrl || bodyCvUrl || '').trim();

    if (!cvUrl) {
      return res.status(400).json({ success: false, message: "Vous devez joindre un CV valide." });
    }

    // 1. Vérifier que l'offre existe et est approuvée
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, title: true, company: true }
    });

    if (!job || !['APPROVED', 'ACTIVE'].includes(String(job.status || '').toUpperCase())) {
      return res.status(404).json({ success: false, message: "Cette offre n'est plus disponible." });
    }

    // 2. Vérifier si le candidat n'a pas DÉJÀ postulé à cette offre (Anti-spam)
    const existingApplication = await prisma.application.findFirst({
      where: { jobId: jobId, candidateId: candidateId }
    });

    if (existingApplication) {
      return res.status(400).json({ success: false, message: "Vous avez déjà postulé à cette offre." });
    }

    // 3. Créer la candidature dans la base de données
    const application = await prisma.application.create({
      data: {
        jobId,
        candidateId,
        message,
        cvUrl,
        status: 'APPLIED'
      }
    });

    // 4. (Optionnel) Envoyer un email à l'entreprise pour la prévenir
    // sendEmail(job.companyEmail, "Nouvelle candidature !", `Quelqu'un a postulé à ${job.title}...`);

    res.status(201).json({
      success: true,
      message: "Votre candidature a été envoyée avec succès !",
      applicationId: application.id
    });

  } catch (error) {
    if (error?.message === 'INVALID_CV_TYPE') {
      return res.status(415).json({ success: false, message: 'Type de fichier reel invalide pour le CV.' });
    }
    if (error?.message === 'INVALID_CV_FOLDER') {
      return res.status(400).json({ success: false, message: 'Dossier de CV invalide.' });
    }
    console.error("Erreur lors de la candidature:", error);
    res.status(500).json({ success: false, message: "Erreur interne lors de l'envoi de la candidature." });
  }
});

module.exports = router;