-- Add bilingual company bio fields on User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "bio_fr" TEXT,
  ADD COLUMN IF NOT EXISTS "bio_en" TEXT;

-- Add bilingual snake_case fields on Job
ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "title_fr" TEXT,
  ADD COLUMN IF NOT EXISTS "title_en" TEXT,
  ADD COLUMN IF NOT EXISTS "description_fr" TEXT,
  ADD COLUMN IF NOT EXISTS "description_en" TEXT;
