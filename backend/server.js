const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// --- Database setup ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();

// --- Middleware ---
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://237jobs.vercel.app',
    'https://admin-237jobs.vercel.app',
    // Vercel preview URLs
    /https:\/\/.*\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(express.json());

// =============================================
// ROUTES: Jobs (Offres d'emploi)
// =============================================

// GET /api/jobs — Liste des offres (avec filtres optionnels)
app.get('/api/jobs', async (req, res) => {
  try {
    const { status, location, search, page = '1', limit = '20' } = req.query;

    const where = {};
    if (status) where.status = String(status);
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
        include: { author: { select: { id: true, name: true, email: true } } },
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

// GET /api/jobs/:id — Détail d'une offre
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide.' });

    const job = await prisma.job.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    if (!job) return res.status(404).json({ error: 'Offre non trouvée.' });
    res.json(job);
  } catch (error) {
    console.error('GET /api/jobs/:id error:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
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
    const data = {};
    if (title !== undefined) data.title = String(title);
    if (company !== undefined) data.company = String(company);
    if (location !== undefined) data.location = String(location);
    if (description !== undefined) data.description = String(description);
    if (salary !== undefined) data.salary = salary ? String(salary) : null;
    if (status !== undefined) data.status = String(status);

    const job = await prisma.job.update({ where: { id }, data });
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
        select: { id: true, email: true, name: true, role: true, isVerified: true, createdAt: true },
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
      select: { id: true, email: true, name: true, role: true, isVerified: true, createdAt: true, jobs: true },
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
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: String(email) } });
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

    const user = await prisma.user.create({
      data: {
        email: String(email),
        password: String(password),
        name: name ? String(name) : null,
        role: role ? String(role) : 'CANDIDAT',
      },
      select: { id: true, email: true, name: true, role: true, isVerified: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('POST /api/users error:', error);
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur." });
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

// GET /api/admin/stats — Statistiques globales
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [usersCount, pendingJobsCount, approvedJobsCount, reportsCount] = await Promise.all([
      prisma.user.count(),
      prisma.job.count({ where: { status: 'PENDING' } }),
      prisma.job.count({ where: { status: 'APPROVED' } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
    ]);

    res.json({
      users: usersCount,
      pendingJobs: pendingJobsCount,
      approvedJobs: approvedJobsCount,
      reports: reportsCount,
    });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des statistiques.' });
  }
});

// =============================================
// ROUTES: OTP (Verification telephone)
// =============================================

// Stockage en memoire des codes OTP (en prod : Redis ou DB)
const otpStore = new Map(); // phone -> { code, expiresAt }
const MASTER_OTP = process.env.MASTER_OTP || '0000';

// POST /api/otp/send — Envoyer un code OTP
app.post('/api/otp/send', (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Numero de telephone requis.' });
    }

    // Nettoyer le numero (garder uniquement les chiffres)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      return res.status(400).json({ error: 'Numero de telephone invalide.' });
    }

    // Generer un code 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(cleanPhone, { code, expiresAt });

    // En production, ici on enverrait le SMS via Twilio/Africa's Talking/etc.
    // Pour le dev/test, on affiche le code dans les logs serveur
    console.log(`[OTP] Code pour ${cleanPhone}: ${code} (ou utilisez le code maitre: ${MASTER_OTP})`);

    res.json({
      message: 'Code OTP envoye avec succes.',
      // En dev, on renvoie le code pour faciliter les tests
      ...(process.env.NODE_ENV !== 'production' && { demoCode: code }),
      expiresIn: '10 minutes',
    });
  } catch (error) {
    console.error('POST /api/otp/send error:', error);
    res.status(500).json({ error: "Erreur lors de l'envoi du code OTP." });
  }
});

// POST /api/otp/verify — Verifier un code OTP
app.post('/api/otp/verify', (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'Telephone et code requis.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const userCode = String(code).trim();

    // ★ Code maitre : toujours accepte (pour les tests)
    if (userCode === MASTER_OTP) {
      console.log(`[OTP] Code maitre utilise pour ${cleanPhone}`);
      otpStore.delete(cleanPhone); // Nettoyer si un vrai code existait
      return res.json({ verified: true, message: 'Telephone verifie avec succes.' });
    }

    // Verifier le vrai code
    const stored = otpStore.get(cleanPhone);

    if (!stored) {
      return res.status(400).json({ verified: false, error: 'Aucun code envoye pour ce numero. Renvoyez un code.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ verified: false, error: 'Code expire. Renvoyez un nouveau code.' });
    }

    if (stored.code !== userCode) {
      return res.status(400).json({ verified: false, error: 'Code incorrect.' });
    }

    // Code correct !
    otpStore.delete(cleanPhone);
    console.log(`[OTP] Telephone ${cleanPhone} verifie avec succes.`);
    res.json({ verified: true, message: 'Telephone verifie avec succes.' });
  } catch (error) {
    console.error('POST /api/otp/verify error:', error);
    res.status(500).json({ error: 'Erreur lors de la verification.' });
  }
});

// --- Page d'accueil API ---
app.get('/', (_req, res) => {
  res.json({
    name: '237jobs API',
    version: '1.0.0',
    status: 'online',
    documentation: {
      health: 'GET /api/health',
      jobs: 'GET /api/jobs',
      users: 'GET /api/users',
      reports: 'GET /api/reports',
      admin: 'GET /api/admin/stats',
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
  console.log(`Backend 237jobs en ligne !`);
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
