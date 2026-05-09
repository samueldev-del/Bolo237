-- Phase A : ajout additif des colonnes chiffrées (AES-256-GCM) et de leurs
-- hashes de lookup (HMAC-SHA256). Aucune valeur existante n'est touchée :
-- la migration est entièrement réversible et déployable sans downtime.
--
-- Étapes prévues APRÈS cette migration :
--   1. Backfill : `node backend/scripts/encrypt-phones.js`
--      → remplit phoneEnc / phoneHash pour toutes les rows où phone IS NOT NULL.
--   2. Bascule applicative (S4-T2 utilisateur) : routes lisent en priorité
--      phoneHash pour findUnique et phoneEnc pour l'affichage déchiffré.
--   3. Phase C migration séparée : DROP COLUMN phone après vérification.

-- User
ALTER TABLE "User" ADD COLUMN "phoneEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneHash" TEXT;
CREATE UNIQUE INDEX "User_phoneHash_key" ON "User"("phoneHash");

-- VerificationSubmission
ALTER TABLE "VerificationSubmission" ADD COLUMN "phoneEnc" TEXT;
ALTER TABLE "VerificationSubmission" ADD COLUMN "phoneHash" TEXT;
CREATE INDEX "VerificationSubmission_phoneHash_idx" ON "VerificationSubmission"("phoneHash");
