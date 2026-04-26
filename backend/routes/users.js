const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Attention: bcryptjs ici !
const { prisma } = require('../lib/db');
const { requireAdminSession } = require('../lib/session');
const { signupIpLimiter, savedJobsLimiter, reviewSubmissionLimiter } = require('../lib/limiters');
const { sendWhatsAppModerationAlert } = require('../lib/twilioService');
const { sendWelcomeEmail, sendAccountVerifiedEmail, transporter } = require('../lib/transactionalEmail');
const { createNotification } = require('../lib/notifications');

// 🛑 /api/users devient /
router.get('/', requireAdminSession, async (req, res) => { /* ... */ });
router.post('/', signupIpLimiter, async (req, res) => { /* ... */ });
router.get('/:id', requireAdminSession, async (req, res) => { /* ... */ });
router.put('/:id', requireAdminSession, async (req, res) => { /* ... */ });
router.put('/:id/ban', requireAdminSession, async (req, res) => { /* ... */ });
router.delete('/:id', requireAdminSession, async (req, res) => { /* ... */ });

// 🛑 Les sous-routes (garde le /:id/...)
router.get('/:id/notifications', async (req, res) => { /* ... */ });
router.patch('/:id/notifications/read-all', async (req, res) => { /* ... */ });
router.get('/:id/applications', async (req, res) => { /* ... */ });
router.get('/:id/saved-jobs', async (req, res) => { /* ... */ });
router.post('/:id/saved-jobs', savedJobsLimiter, async (req, res) => { /* ... */ });
router.delete('/:id/saved-jobs/:jobId', async (req, res) => { /* ... */ });
router.get('/:id/reviews', async (req, res) => { /* ... */ });
router.post('/:id/reviews', reviewSubmissionLimiter, async (req, res) => { /* ... */ });

module.exports = router;