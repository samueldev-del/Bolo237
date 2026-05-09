'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { prisma } = require('./db');

const OTP_TTL_MS = (Number(process.env.OTP_VALIDITY_MINUTES) > 0
  ? Number(process.env.OTP_VALIDITY_MINUTES)
  : 5) * 60_000;

const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) > 0
  ? Number(process.env.OTP_MAX_ATTEMPTS)
  : 5;

const OTP_BCRYPT_ROUNDS = 10;

const INVALID_CODE_MESSAGE = 'Code invalide ou expire.';

function generateCode() {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

async function hashCode(code) {
  return bcrypt.hash(String(code), OTP_BCRYPT_ROUNDS);
}

/**
 * Stocke un OTP fraîchement généré. Réinitialise attempts/consumed.
 * Pendant la phase A de migration, on remplit aussi `code` (en clair) pour
 * conserver la rétro-compatibilité jusqu'au déploiement de la phase B.
 */
async function issueOtp(phone) {
  const code = generateCode();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const phoneKey = String(phone);

  await prisma.otpCode.upsert({
    where: { phone: phoneKey },
    update: {
      code,             // PHASE A : à supprimer après bascule complète des consommateurs
      codeHash,
      expiresAt,
      attempts: 0,
      consumed: false,
    },
    create: {
      phone: phoneKey,
      code,             // PHASE A
      codeHash,
      expiresAt,
      attempts: 0,
      consumed: false,
    },
  });

  return code;
}

/**
 * Vérifie un OTP. Retourne { ok: true } ou { ok: false, message } avec
 * un message générique pour empêcher l'énumération de l'état (CWE-204).
 * Incrémente atomiquement le compteur d'échecs et bloque au-delà de OTP_MAX_ATTEMPTS.
 */
async function verifyOtp(phone, providedCode) {
  const phoneKey = String(phone);
  const record = await prisma.otpCode.findUnique({ where: { phone: phoneKey } });

  if (!record) {
    return { ok: false, status: 400, message: INVALID_CODE_MESSAGE };
  }

  if (record.consumed) {
    return { ok: false, status: 400, message: INVALID_CODE_MESSAGE };
  }

  if (record.expiresAt <= new Date()) {
    return { ok: false, status: 400, message: INVALID_CODE_MESSAGE };
  }

  if ((record.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    return { ok: false, status: 429, message: 'Trop de tentatives. Demandez un nouveau code.' };
  }

  // Compatibilité phase A : si codeHash absent (anciens enregistrements),
  // on tombe sur la comparaison legacy en clair, qui sera supprimée en phase B.
  let valid = false;
  if (record.codeHash) {
    try {
      valid = await bcrypt.compare(String(providedCode), record.codeHash);
    } catch {
      valid = false;
    }
  } else if (typeof record.code === 'string' && record.code.length === providedCode?.length) {
    try {
      valid = crypto.timingSafeEqual(
        Buffer.from(String(record.code)),
        Buffer.from(String(providedCode)),
      );
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    await prisma.otpCode.update({
      where: { phone: phoneKey },
      data: { attempts: { increment: 1 } },
    }).catch(() => { /* best-effort, ne pas révéler l'échec d'incrément */ });
    return { ok: false, status: 400, message: INVALID_CODE_MESSAGE };
  }

  // Marque consommé plutôt que delete : conserve trace pour audit + bloque rejeu.
  await prisma.otpCode.update({
    where: { phone: phoneKey },
    data: { consumed: true },
  });

  return { ok: true };
}

module.exports = {
  generateCode,
  hashCode,
  issueOtp,
  verifyOtp,
  INVALID_CODE_MESSAGE,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
};
