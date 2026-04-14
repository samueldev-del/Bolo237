-- Run with the PostgreSQL database owner role, not the restricted API role.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "CandidateProfile_createdAt_idx" ON "CandidateProfile"("createdAt");

CREATE INDEX IF NOT EXISTS "Job_createdAt_idx" ON "Job"("createdAt");
CREATE INDEX IF NOT EXISTS "Job_status_createdAt_idx" ON "Job"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Job_authorId_createdAt_idx" ON "Job"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Job_title_trgm_idx" ON "Job" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Job_company_trgm_idx" ON "Job" USING GIN ("company" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Job_location_trgm_idx" ON "Job" USING GIN ("location" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Job_description_trgm_idx" ON "Job" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_title_trgm_idx" ON "Notification" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Notification_message_trgm_idx" ON "Notification" USING GIN ("message" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Notification_type_trgm_idx" ON "Notification" USING GIN ("type" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX IF NOT EXISTS "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Report_targetType_targetId_status_idx" ON "Report"("targetType", "targetId", "status");

CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_role_createdAt_idx" ON "User"("role", "createdAt");
CREATE INDEX IF NOT EXISTS "User_role_isVerified_idx" ON "User"("role", "isVerified");
CREATE INDEX IF NOT EXISTS "User_isBanned_bannedAt_idx" ON "User"("isBanned", "bannedAt");
CREATE INDEX IF NOT EXISTS "User_name_trgm_idx" ON "User" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_email_trgm_idx" ON "User" USING GIN ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_phone_trgm_idx" ON "User" USING GIN ("phone" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "PrivacyRequest_reference_trgm_idx" ON "PrivacyRequest" USING GIN ("reference" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PrivacyRequest_requesterEmail_trgm_idx" ON "PrivacyRequest" USING GIN ("requesterEmail" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PrivacyRequest_requesterName_trgm_idx" ON "PrivacyRequest" USING GIN ("requesterName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PrivacyRequest_requesterPhone_trgm_idx" ON "PrivacyRequest" USING GIN ("requesterPhone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PrivacyRequest_requesterRole_trgm_idx" ON "PrivacyRequest" USING GIN ("requesterRole" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PrivacyRequest_reason_trgm_idx" ON "PrivacyRequest" USING GIN ("reason" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PrivacyRequest_notes_trgm_idx" ON "PrivacyRequest" USING GIN ("notes" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PrivacyRequest_processedBy_trgm_idx" ON "PrivacyRequest" USING GIN ("processedBy" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "UserReview_createdAt_idx" ON "UserReview"("createdAt");

CREATE INDEX IF NOT EXISTS "VerificationSubmission_submittedAt_idx" ON "VerificationSubmission"("submittedAt");
CREATE INDEX IF NOT EXISTS "VerificationSubmission_phone_submittedAt_idx" ON "VerificationSubmission"("phone", "submittedAt");