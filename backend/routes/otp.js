const express = require('express');
const { z } = require('zod');

const { twilioClient } = require('../lib/twilioService');
const { otpIpLimiter, otpPhoneLimiter, otpVerifyLimiter } = require('../lib/limiters');
const { validateBody } = require('../lib/requestValidation');
const { issueOtp, verifyOtp } = require('../lib/otp');

const router = express.Router();

const sendOtpSchema = z.object({
  phone: z.string().trim().min(1, 'Numero de telephone requis.'),
});

const verifyOtpSchema = z.object({
  phone: z.string().trim().min(1, 'Numero de telephone requis.'),
  code: z.string().trim().min(1, 'Code requis.'),
});

router.post('/send', otpIpLimiter, otpPhoneLimiter, validateBody(sendOtpSchema), async (req, res) => {
  const { phone } = req.body;

  try {
    const otp = await issueOtp(phone);

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        body: `Bienvenue sur Bolo237 ! Votre code de vérification est : ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`✅ SMS envoyé avec succès à ${phone}`);
    } else if (process.env.NODE_ENV === 'development') {
      // OTP affiché UNIQUEMENT en environnement de développement local.
      console.warn(`[DEV ONLY] OTP ${phone} -> ${otp}`);
    } else {
      console.warn('⚠️ Twilio non configuré : OTP non envoyé. Vérifiez TWILIO_* en env.');
    }

    res.json({ success: true, message: 'Code envoyé par SMS' });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi du SMS Twilio:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi du SMS. Veuillez réessayer." });
  }
});

router.post('/verify', otpVerifyLimiter, validateBody(verifyOtpSchema), async (req, res) => {
  const { phone, code } = req.body;
  const result = await verifyOtp(phone, code);

  if (!result.ok) {
    return res.status(result.status || 400).json({ error: result.message });
  }

  res.json({ success: true, verified: true, message: 'Téléphone vérifié avec succès' });
});

module.exports = router;
