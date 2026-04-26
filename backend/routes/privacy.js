// backend/routes/privacy.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
// const { requireUserSession } = require('../lib/sessions');

// Exemple : /api/privacy/export devient /export
router.get('/export', async (req, res) => {
  // ✂️ Logique d'export de données
});

// Exemple : /api/privacy/delete-account devient /delete-account
router.delete('/delete-account', async (req, res) => {
  // ✂️ Logique de suppression
});

module.exports = router;