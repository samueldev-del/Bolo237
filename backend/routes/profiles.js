const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
const { profileFromBody } = require('../lib/profiles'); // Vérifie l'import !

// 🛑 /api/profiles/:userId devient /:userId
router.get('/:userId', async (req, res) => { /* ... */ });
router.put('/:userId', async (req, res) => { /* ... */ });

module.exports = router;