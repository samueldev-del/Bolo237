-- Soft-delete phase A : ajout des colonnes `deletedAt` sur les modèles
-- principaux (User, Job, Application) et de leurs index. Toutes les colonnes
-- sont nullable, donc additif et réversible. Le code existant continue de
-- fonctionner ; les routes migrent progressivement vers `excludeDeleted()`.
--
-- Usage RGPD :
--   1. /api/users/me/delete : anonymise immédiatement (email, phone,
--      name, photoUrl) et pose deletedAt.
--   2. backend/cron/purgeDeletedUsers.js : purge définitive après 30 jours.

-- User
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- Job
ALTER TABLE "Job" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Job_deletedAt_idx" ON "Job"("deletedAt");

-- Application
ALTER TABLE "Application" ADD COLUMN "deletedAt" TIMESTAMP(3);
