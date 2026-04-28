const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { prisma } = require('../lib/db');
const { reportError } = require('../lib/observability');
const { twilioClient } = require('../lib/twilioService');
const { transporter } = require('../lib/emailService');
const {
  sendPasswordResetCodeEmail,
  sendPasswordResetConfirmationEmail,
} = require('../lib/transactionalEmail');
const {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  clearSessionCookie,
  createSessionToken,
  readSessionToken,
} = require('../lib/session');
const {
  loginIpLimiter,
  loginIdentifierLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require('../lib/limiters');

const router = express.Router();

router.post('/login', loginIpLimiter, loginIdentifierLimiter, async (req, res) => {
  try {
    const { email, phone, identifier, password } = req.body;
    const loginIdentifier = String(identifier || email || phone || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Identifiant (email ou telephone) et mot de passe requis.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier.toLowerCase() },
          { phone: loginIdentifier },
        ],
      },
    });
    if (!user) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    const valid = await bcrypt.compare(String(password), user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Compte banni.', reason: user.banReason });
    }

    const token = createSessionToken(user);
    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    const { password: _pw, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const payload = await readSessionToken(req);
    if (!payload?.userId) return res.status(401).json({ error: 'Session invalide.' });

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.userId) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        photoUrl: true,
        isVerified: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
      },
    });

    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Session invalide.' });
    }

    if (user.isBanned) {
      clearSessionCookie(res);
      return res.status(403).json({ error: 'Compte banni.', reason: user.banReason });
    }

    return res.json(user);
  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    return res.status(500).json({ error: 'Erreur lors de la verification de session.' });
  }
});

router.post('/logout', async (req, res) => {
  const raw = req.cookies?.[SESSION_COOKIE_NAME];
  if (raw) {
    try {
      const decoded = jwt.decode(raw);
      if (decoded?.jti) {
        const expMs = decoded?.exp ? Number(decoded.exp) * 1000 : Date.now() + (7 * 24 * 60 * 60 * 1000);
        const expiresAt = new Date(expMs);
        await prisma.revokedSession.upsert({
          where: { jti: String(decoded.jti) },
          update: { expiresAt },
          create: { jti: String(decoded.jti), expiresAt },
        });
      }
    } catch (error) {
      console.error('logout revoke error:', error);
    }
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Numéro de téléphone requis.' });

    const user = await prisma.user.findUnique({ where: { phone: String(phone) } });
    if (!user) return res.status(404).json({ error: 'Aucun compte associé à ce numéro.' });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000);
    const phoneKey = String(phone);
    await prisma.otpCode.upsert({
      where: { phone: phoneKey },
      update: { code: otp, expiresAt },
      create: { phone: phoneKey, code: otp, expiresAt },
    });

    const deliveryTasks = [];

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      deliveryTasks.push(
        twilioClient.messages.create({
          body: `Bolo237 — Votre code de réinitialisation : ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone,
        }),
      );
    }

    deliveryTasks.push(sendPasswordResetCodeEmail({ transporter, user, code: otp }));

    await Promise.allSettled(deliveryTasks);

    res.json({ success: true, message: 'Code envoye. Verifiez votre SMS ou votre email.' });
  } catch (error) {
    reportError('forgot-password error', error, { route: '/api/auth/forgot-password' });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) {
      return res.status(400).json({ error: 'Téléphone, code et nouveau mot de passe requis.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const phoneKey = String(phone);
    const record = await prisma.otpCode.findUnique({ where: { phone: phoneKey } });

    if (!record) return res.status(400).json({ error: 'Aucun code demandé pour ce numéro.' });
    if (record.expiresAt <= new Date()) {
      await prisma.otpCode.deleteMany({ where: { phone: phoneKey } });
      return res.status(400).json({ error: 'Le code a expiré.' });
    }
    if (record.code !== code) {
      return res.status(400).json({ error: 'Code incorrect.' });
    }

    await prisma.otpCode.deleteMany({ where: { phone: phoneKey } });

    const user = await prisma.user.findUnique({ where: { phone: String(phone) } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    await sendPasswordResetConfirmationEmail({ transporter, user });

    console.log(`✅ Mot de passe réinitialisé pour user ${user.id} (${phone})`);
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    reportError('reset-password error', error, { route: '/api/auth/reset-password' });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
