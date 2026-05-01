-- Audit perf indexes — run as DB owner. Idempotent (IF NOT EXISTS).

-- Application: hot-path indexes for candidate dashboard polling and recruiter views.
CREATE INDEX IF NOT EXISTS "Application_candidateId_createdAt_idx" ON "Application"("candidateId", "createdAt");
CREATE INDEX IF NOT EXISTS "Application_jobId_status_idx" ON "Application"("jobId", "status");
CREATE INDEX IF NOT EXISTS "Application_status_createdAt_idx" ON "Application"("status", "createdAt");

-- User: artisan directory queries filter on (role, isVerified) and order by createdAt.
CREATE INDEX IF NOT EXISTS "User_role_isVerified_createdAt_idx" ON "User"("role", "isVerified", "createdAt");
