'use strict';

/**
 * Helpers soft-delete RGPD. Volontairement non couplés à une extension Prisma
 * globale pour éviter de masquer accidentellement des rows soft-deletées dans
 * les routes admin (consultation des comptes supprimés pour audit/restoration).
 *
 * Convention :
 *   - `where: excludeDeleted({ ... })` filtre les rows actives sur les routes
 *     publiques et candidat/entreprise.
 *   - Les routes admin et les crons gèrent explicitement `deletedAt`.
 */

const crypto = require('crypto');
const { prisma } = require('./db');

const PURGE_DELAY_DAYS = Number(process.env.RGPD_PURGE_DELAY_DAYS) > 0
  ? Number(process.env.RGPD_PURGE_DELAY_DAYS)
  : 30;

/**
 * Étend un `where` Prisma avec `deletedAt: null`. Préserve les autres clauses.
 * Si `deletedAt` est déjà défini (admin filtrant explicitement), on respecte.
 */
function excludeDeleted(where) {
  if (!where || typeof where !== 'object') return { deletedAt: null };
  if ('deletedAt' in where) return where;
  return { ...where, deletedAt: null };
}

/**
 * Anonymise les PII d'un user et pose `deletedAt`. Les champs UNIQUE (email,
 * phone, phoneHash) sont remplacés par des valeurs déterministes basées sur
 * l'id pour éviter toute collision et préserver la possibilité de re-créer
 * un compte avec le même email/téléphone.
 *
 * Ne hard-delete pas immédiatement : les données restent disponibles pour
 * audit (réclamations, fraude) jusqu'à la purge cron à J+30.
 */
async function softDeleteUser(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('softDeleteUser: id invalide');
  }

  const tombstone = `deleted-${id}-${Date.now().toString(36)}`;
  const tombstoneEmail = `${tombstone}@deleted.bolo237.local`;
  const passwordPlaceholder = crypto.randomBytes(32).toString('hex');

  return prisma.user.update({
    where: { id },
    data: {
      email: tombstoneEmail,
      name: null,
      phone: null,
      phoneEnc: null,
      phoneHash: null,
      photoUrl: null,
      bio_fr: null,
      bio_en: null,
      password: passwordPlaceholder, // empêche tout login sur le compte tombstone
      isVerified: false,
      isBanned: true,
      banReason: 'Compte supprime par l utilisateur (RGPD)',
      bannedAt: new Date(),
      deletedAt: new Date(),
    },
  });
}

/**
 * Purge définitive : supprime hard-delete tous les users dont la suppression
 * douce date de plus de PURGE_DELAY_DAYS jours.
 * Les onDelete: Cascade s'occupent des relations (jobs, applications, etc.).
 */
async function purgeExpiredUsers() {
  const cutoff = new Date(Date.now() - PURGE_DELAY_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.user.deleteMany({
    where: { deletedAt: { lt: cutoff } },
  });
  return result.count;
}

module.exports = {
  excludeDeleted,
  softDeleteUser,
  purgeExpiredUsers,
  PURGE_DELAY_DAYS,
};
