-- Phase A : ajout additif des colonnes de durcissement OTP.
-- Aucun champ existant n'est dropé, aucune contrainte NOT NULL ajoutée sur
-- des données existantes : la migration est entièrement réversible et
-- déployable sans downtime. La phase B (drop "code") sera planifiée séparément
-- une fois tous les anciens OTP expirés (max 5 minutes après le déploiement).

-- 1) `code` devient nullable pour permettre, à terme, sa suppression.
ALTER TABLE "OtpCode" ALTER COLUMN "code" DROP NOT NULL;

-- 2) Ajout de la version hashée (bcrypt). NULL pour les enregistrements
--    pré-déploiement ; la lib backend/lib/otp.js gère le fallback legacy.
ALTER TABLE "OtpCode" ADD COLUMN "codeHash" TEXT;

-- 3) Compteur d'échecs pour le plafonnement anti-brute-force (5 par défaut).
ALTER TABLE "OtpCode" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- 4) Marqueur de consommation pour empêcher le rejeu après succès.
ALTER TABLE "OtpCode" ADD COLUMN "consumed" BOOLEAN NOT NULL DEFAULT false;
