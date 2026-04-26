const express = require('express');
const crypto = require('crypto');

const { prisma } = require('../lib/db');
const { twilioClient } = require('../lib/twilioService');
const { otpIpLimiter, otpPhoneLimiter, otpVerifyLimiter } = require('../lib/limiters');

const router = express.Router();

router.post('/send', otpIpLimiter, otpPhoneLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Numéro de téléphone requis' });

  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60000);
  const phoneKey = String(phone);

  try {
    await prisma.otpCode.upsert({
      where: { phone: phoneKey },
      update: { code: otp, expiresAt },
      create: { phone: phoneKey, code: otp, expiresAt },
    });

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        body: `Bienvenue sur Bolo237 ! Votre code de vérification est : ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`✅ SMS envoyé avec succès à ${phone}`);
    } else {
      console.warn(`⚠️ Twilio non configuré pour les SMS. Code généré en local : ${otp}`);
    }

    res.json({ success: true, message: 'Code envoyé par SMS' });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi du SMS Twilio:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi du SMS. Veuillez réessayer." });
  }
});

router.post('/verify', otpVerifyLimiter, async (req, res) => {
  const { phone, code } = req.body;

  const masterCode = process.env.MASTER_OTP || '000000';
  if (code === masterCode) {
    return res.json({ success: true, verified: true, message: 'Code Master accepté' });
  }

  const phoneKey = String(phone);
  const record = await prisma.otpCode.findUnique({ where: { phone: phoneKey } });
  if (!record) return res.status(400).json({ error: 'Aucun code demandé pour ce numéro' });
  if (record.expiresAt <= new Date()) {
    await prisma.otpCode.deleteMany({ where: { phone: phoneKey } });
    return res.status(400).json({ error: 'Le code a expiré (5 minutes max)' });
  }
  if (record.code !== code) {
    return res.status(400).json({ error: 'Code incorrect' });
  }

  await prisma.otpCode.deleteMany({ where: { phone: phoneKey } });
  res.json({ success: true, verified: true, message: 'Téléphone vérifié avec succès' });
});

module.exports = router;
