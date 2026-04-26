// backend/routes/feedbacks.js
const express = require('express');
const router = express.Router();

// Importe tes outils (ajuste les noms selon tes fichiers dans lib/)
const { prisma } = require('../lib/db'); // ou le fichier où tu as exporté prisma
// const { requireUserSession } = require('../lib/sessions'); 

// 🛑 ATTENTION : /api/feedbacks devient juste /
router.post('/', async (req, res) => {
  // ✂️ Colle ici la logique de création de feedback
});

router.get('/', async (req, res) => {
  // ✂️ Colle ici la logique de lecture des feedbacks
});

module.exports = router;