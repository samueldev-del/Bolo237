'use strict';

/**
 * Backfill : chiffre les téléphones existants (User + VerificationSubmission)
 * et calcule leur hash de lookup. Idempotent : passe les rows déjà migrées.
 *
 * Pré-requis :
 *   - Migration `20260509094415_pii_encryption_phase1` appliquée.
 *   - Variables DATA_ENCRYPTION_KEY et DATA_LOOKUP_HMAC_KEY définies.
 *
 * Usage :
 *   node backend/scripts/encrypt-phones.js
 *   node backend/scripts/encrypt-phones.js --dry-run
 *
 * Stratégie :
 *   - Traitement par batch de 500 rows.
 *   - Si phoneEnc déjà présent → skip (idempotence).
 *   - phone reste en clair tant que la phase C (drop column) n'est pas appliquée.
 *   - Les erreurs par row sont collectées et rapportées en fin d'exécution
 *     sans bloquer la migration globale.
 */

const { prisma } = require('../lib/db');
const { encrypt, lookupHash, isEncrypted } = require('../lib/crypto');

const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes('--dry-run');

function logProgress(label, processed, total) {
  const pct = total > 0 ? ((processed / total) * 100).toFixed(1) : '0.0';
  console.log(`[backfill] ${label}: ${processed}/${total} (${pct}%)`);
}

async function backfillUserPhones() {
  const total = await prisma.user.count({
    where: { phone: { not: null }, phoneEnc: null },
  });
  console.log(`[backfill] User.phone à chiffrer : ${total}`);
  if (total === 0) return { ok: 0, errors: [] };

  let processed = 0;
  let ok = 0;
  const errors = [];

  while (processed < total) {
    const batch = await prisma.user.findMany({
      where: { phone: { not: null }, phoneEnc: null },
      select: { id: true, phone: true },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
    });
    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        if (!row.phone) continue;
        if (isEncrypted(row.phone)) continue;
        const enc = encrypt(row.phone);
        const hash = lookupHash(row.phone);
        if (!DRY_RUN) {
          await prisma.user.update({
            where: { id: row.id },
            data: { phoneEnc: enc, phoneHash: hash },
          });
        }
        ok += 1;
      } catch (err) {
        errors.push({ id: row.id, error: err.message || String(err) });
      }
    }

    processed += batch.length;
    logProgress('User', processed, total);
  }

  return { ok, errors };
}

async function backfillVerificationPhones() {
  const total = await prisma.verificationSubmission.count({
    where: { phoneEnc: null },
  });
  console.log(`[backfill] VerificationSubmission.phone à chiffrer : ${total}`);
  if (total === 0) return { ok: 0, errors: [] };

  let processed = 0;
  let ok = 0;
  const errors = [];

  while (processed < total) {
    const batch = await prisma.verificationSubmission.findMany({
      where: { phoneEnc: null },
      select: { id: true, phone: true },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
    });
    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        if (!row.phone) continue;
        if (isEncrypted(row.phone)) continue;
        const enc = encrypt(row.phone);
        const hash = lookupHash(row.phone);
        if (!DRY_RUN) {
          await prisma.verificationSubmission.update({
            where: { id: row.id },
            data: { phoneEnc: enc, phoneHash: hash },
          });
        }
        ok += 1;
      } catch (err) {
        errors.push({ id: row.id, error: err.message || String(err) });
      }
    }

    processed += batch.length;
    logProgress('VerificationSubmission', processed, total);
  }

  return { ok, errors };
}

async function main() {
  const start = Date.now();
  console.log(`[backfill] Démarrage ${DRY_RUN ? '(DRY-RUN)' : ''}`);

  const userResult = await backfillUserPhones();
  const verificationResult = await backfillVerificationPhones();

  const totalOk = userResult.ok + verificationResult.ok;
  const totalErrors = [...userResult.errors, ...verificationResult.errors];

  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n[backfill] Terminé en ${elapsedSec}s.`);
  console.log(`  OK    : ${totalOk}`);
  console.log(`  Errors: ${totalErrors.length}`);
  if (totalErrors.length > 0) {
    console.log('\nErreurs (5 premières) :');
    for (const err of totalErrors.slice(0, 5)) {
      console.log(`  - id=${err.id} : ${err.error}`);
    }
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('[backfill] Erreur fatale :', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
