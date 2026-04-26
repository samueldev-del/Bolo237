const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
const { calcCvMajJours } = require('../lib/profiles');
const { sendWhatsAppModerationAlert } = require('../lib/twilioService');
const { candidateProfileLimiter } = require('../lib/limiters');

// 🛑 /api/candidates devient /
router.get('/', async (req, res) => { /* ... */ });
router.post('/', candidateProfileLimiter, async (req, res) => { /* ... */ });
router.get('/:id', async (req, res) => { /* ... */ });

module.exports = router;