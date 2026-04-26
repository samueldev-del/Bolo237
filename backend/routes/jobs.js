// backend/routes/jobs.js
const express = require('express');
const router = express.Router();

// ⚠️ N'oublie pas d'importer tes outils (ajuste les chemins si besoin)
const { prisma } = require('../lib/db');
// const { requireUserSession, requireAdminSession } = require('../lib/sessions');
// const { upload } = require('../lib/uploads'); // Si tu as des uploads de CV dans "postuler"
// const { sendEmail } = require('../lib/transactionalEmail');

// 🛑 /api/jobs devient /
router.get('/', async (req, res) => {
  // ✂️ Logique pour lister les jobs
});

// 🛑 /api/jobs/:id devient /:id
router.get('/:id', async (req, res) => {
  // ✂️ Logique pour un job spécifique
});

// 🛑 /api/jobs (POST) devient /
router.post('/', /* tes middlewares (auth, upload) */ async (req, res) => {
  // ✂️ Logique pour créer un job
});

// 🛑 /api/jobs/:id/apply devient /:id/apply
router.post('/:id/apply', /* middlewares */ async (req, res) => {
  // ✂️ Logique pour postuler
});

// Ajoute aussi les PUT (modification) et DELETE (suppression) liés aux jobs

module.exports = router;