CREATE INDEX IF NOT EXISTS "CandidateProfile_createdAt_idx" ON "CandidateProfile"("createdAt");

CREATE INDEX IF NOT EXISTS "Job_createdAt_idx" ON "Job"("createdAt");
CREATE INDEX IF NOT EXISTS "Job_status_createdAt_idx" ON "Job"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Job_authorId_createdAt_idx" ON "Job"("authorId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX IF NOT EXISTS "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Report_targetType_targetId_status_idx" ON "Report"("targetType", "targetId", "status");

CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_role_createdAt_idx" ON "User"("role", "createdAt");
CREATE INDEX IF NOT EXISTS "User_role_isVerified_idx" ON "User"("role", "isVerified");
CREATE INDEX IF NOT EXISTS "User_isBanned_bannedAt_idx" ON "User"("isBanned", "bannedAt");

CREATE INDEX IF NOT EXISTS "UserReview_createdAt_idx" ON "UserReview"("createdAt");

CREATE INDEX IF NOT EXISTS "VerificationSubmission_submittedAt_idx" ON "VerificationSubmission"("submittedAt");
CREATE INDEX IF NOT EXISTS "VerificationSubmission_phone_submittedAt_idx" ON "VerificationSubmission"("phone", "submittedAt");