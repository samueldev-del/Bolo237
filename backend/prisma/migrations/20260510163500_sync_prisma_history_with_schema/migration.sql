-- Reconcile migration history with schema changes that already exist in the
-- local development database but were not captured in migration files.

-- AppFeedback
CREATE INDEX IF NOT EXISTS "AppFeedback_userId_createdAt_idx"
ON "AppFeedback"("userId", "createdAt");

-- Job
ALTER TABLE "Job" DROP CONSTRAINT IF EXISTS "Job_authorId_fkey";

ALTER TABLE "Job"
ADD CONSTRAINT "Job_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Job_slug_idx" ON "Job"("slug");

-- SavedJob
ALTER TABLE "SavedJob"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "SavedJob_userId_idx";

CREATE INDEX IF NOT EXISTS "SavedJob_userId_createdAt_idx"
ON "SavedJob"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "SavedJob_jobId_idx" ON "SavedJob"("jobId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SavedJob_userId_fkey'
  ) THEN
    ALTER TABLE "SavedJob"
    ADD CONSTRAINT "SavedJob_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SavedJob_jobId_fkey'
  ) THEN
    ALTER TABLE "SavedJob"
    ADD CONSTRAINT "SavedJob_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END
$$;