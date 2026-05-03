-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDAT', 'ENTREPRISE', 'ARTISAN', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'ACTIVE', 'APPROVED', 'REJECTED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('JOB', 'USER', 'COMMENT', 'MESSAGE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "contactClicks" INTEGER NOT NULL DEFAULT 0,
    "role" "Role" NOT NULL DEFAULT 'CANDIDAT',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" TIMESTAMP(3),
    "banReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtisanService" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtisanService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtisanPortfolio" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtisanPortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "reference" TEXT,
    "externalApplyUrl" TEXT,
    "title" TEXT NOT NULL,
    "titleFr" TEXT,
    "titleEn" TEXT,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionFr" TEXT,
    "descriptionEn" TEXT,
    "salary" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "reason" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userId" INTEGER,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "requesterRole" TEXT,
    "requesterName" TEXT,
    "reason" TEXT,
    "delivery" TEXT,
    "sourceIp" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,
    "payload" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppFeedback" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "authorName" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReview" (
    "id" SERIAL NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "reviewedId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "nom" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "localisation" TEXT NOT NULL DEFAULT 'Douala',
    "experience" TEXT NOT NULL DEFAULT 'Confirme',
    "disponibilite" TEXT NOT NULL DEFAULT 'Immediatement',
    "etudes" TEXT NOT NULL DEFAULT 'Bac+3',
    "competences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disponibleNow" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "availability" TEXT NOT NULL DEFAULT '',
    "profileVisible" BOOLEAN NOT NULL DEFAULT true,
    "jobAlertRole" TEXT NOT NULL DEFAULT '',
    "jobAlertCity" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "profile" TEXT NOT NULL DEFAULT '',
    "defaultCvUrl" TEXT NOT NULL DEFAULT '',
    "experience" TEXT NOT NULL DEFAULT '',
    "education" TEXT NOT NULL DEFAULT '',
    "skillsText" TEXT NOT NULL DEFAULT '',
    "languagesText" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ContactClickEvent" (
    "id" SERIAL NOT NULL,
    "artisanId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedJob" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationSubmission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "notes" TEXT,
    "payload" JSONB NOT NULL,

    CONSTRAINT "VerificationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevokedSession" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedSession_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT,
    "imapUid" INTEGER,
    "mailboxPath" TEXT NOT NULL DEFAULT 'INBOX',
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "cvUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");

-- CreateIndex
CREATE INDEX "User_role_isVerified_idx" ON "User"("role", "isVerified");

-- CreateIndex
CREATE INDEX "User_role_isVerified_createdAt_idx" ON "User"("role", "isVerified", "createdAt");

-- CreateIndex
CREATE INDEX "User_isBanned_bannedAt_idx" ON "User"("isBanned", "bannedAt");

-- CreateIndex
CREATE INDEX "User_name_trgm_idx" ON "User" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "User_email_trgm_idx" ON "User" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "User_phone_trgm_idx" ON "User" USING GIN ("phone" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "ArtisanService_userId_createdAt_idx" ON "ArtisanService"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ArtisanService_name_trgm_idx" ON "ArtisanService" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "ArtisanPortfolio_userId_createdAt_idx" ON "ArtisanPortfolio"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_reference_key" ON "Job"("reference");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Job_authorId_createdAt_idx" ON "Job"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Job_title_trgm_idx" ON "Job" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Job_company_trgm_idx" ON "Job" USING GIN ("company" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Job_location_trgm_idx" ON "Job" USING GIN ("location" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Job_description_trgm_idx" ON "Job" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_status_idx" ON "Report"("targetType", "targetId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_title_trgm_idx" ON "Notification" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Notification_message_trgm_idx" ON "Notification" USING GIN ("message" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Notification_type_trgm_idx" ON "Notification" USING GIN ("type" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyRequest_reference_key" ON "PrivacyRequest"("reference");

-- CreateIndex
CREATE INDEX "PrivacyRequest_status_requestedAt_idx" ON "PrivacyRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_kind_requestedAt_idx" ON "PrivacyRequest"("kind", "requestedAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_userId_requestedAt_idx" ON "PrivacyRequest"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_reference_trgm_idx" ON "PrivacyRequest" USING GIN ("reference" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PrivacyRequest_requesterEmail_trgm_idx" ON "PrivacyRequest" USING GIN ("requesterEmail" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PrivacyRequest_requesterName_trgm_idx" ON "PrivacyRequest" USING GIN ("requesterName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PrivacyRequest_requesterPhone_trgm_idx" ON "PrivacyRequest" USING GIN ("requesterPhone" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PrivacyRequest_requesterRole_trgm_idx" ON "PrivacyRequest" USING GIN ("requesterRole" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PrivacyRequest_reason_trgm_idx" ON "PrivacyRequest" USING GIN ("reason" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PrivacyRequest_notes_trgm_idx" ON "PrivacyRequest" USING GIN ("notes" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PrivacyRequest_processedBy_trgm_idx" ON "PrivacyRequest" USING GIN ("processedBy" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "AppFeedback_createdAt_idx" ON "AppFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "UserReview_reviewedId_createdAt_idx" ON "UserReview"("reviewedId", "createdAt");

-- CreateIndex
CREATE INDEX "UserReview_reviewerId_createdAt_idx" ON "UserReview"("reviewerId", "createdAt");

-- CreateIndex
CREATE INDEX "UserReview_createdAt_idx" ON "UserReview"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "CandidateProfile_userId_idx" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "CandidateProfile_createdAt_idx" ON "CandidateProfile"("createdAt");

-- CreateIndex
CREATE INDEX "CandidateProfile_localisation_idx" ON "CandidateProfile"("localisation");

-- CreateIndex
CREATE INDEX "CandidateProfile_experience_createdAt_idx" ON "CandidateProfile"("experience", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateProfile_disponibilite_createdAt_idx" ON "CandidateProfile"("disponibilite", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateProfile_etudes_createdAt_idx" ON "CandidateProfile"("etudes", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateProfile_disponibleNow_createdAt_idx" ON "CandidateProfile"("disponibleNow", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateProfile_competences_idx" ON "CandidateProfile" USING GIN ("competences");

-- CreateIndex
CREATE INDEX "UserProfile_updatedAt_idx" ON "UserProfile"("updatedAt");

-- CreateIndex
CREATE INDEX "UserProfile_defaultCvUrl_idx" ON "UserProfile"("defaultCvUrl");

-- CreateIndex
CREATE INDEX "UserProfile_profileVisible_updatedAt_idx" ON "UserProfile"("profileVisible", "updatedAt");

-- CreateIndex
CREATE INDEX "ContactClickEvent_artisanId_createdAt_idx" ON "ContactClickEvent"("artisanId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactClickEvent_createdAt_idx" ON "ContactClickEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SavedJob_userId_idx" ON "SavedJob"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedJob_userId_jobId_key" ON "SavedJob"("userId", "jobId");

-- CreateIndex
CREATE INDEX "VerificationSubmission_submittedAt_idx" ON "VerificationSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "VerificationSubmission_status_submittedAt_idx" ON "VerificationSubmission"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "VerificationSubmission_phone_submittedAt_idx" ON "VerificationSubmission"("phone", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationSubmission_role_accountKey_key" ON "VerificationSubmission"("role", "accountKey");

-- CreateIndex
CREATE UNIQUE INDEX "OtpCode_phone_key" ON "OtpCode"("phone");

-- CreateIndex
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");

-- CreateIndex
CREATE INDEX "RevokedSession_expiresAt_idx" ON "RevokedSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_messageId_key" ON "SupportTicket"("messageId");

-- CreateIndex
CREATE INDEX "SupportTicket_mailboxPath_createdAt_idx" ON "SupportTicket"("mailboxPath", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_mailboxPath_status_idx" ON "SupportTicket"("mailboxPath", "status");

-- CreateIndex
CREATE INDEX "Application_candidateId_createdAt_idx" ON "Application"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "Application_jobId_status_idx" ON "Application"("jobId", "status");

-- CreateIndex
CREATE INDEX "Application_status_createdAt_idx" ON "Application"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_candidateId_key" ON "Application"("jobId", "candidateId");

-- AddForeignKey
ALTER TABLE "ArtisanService" ADD CONSTRAINT "ArtisanService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanPortfolio" ADD CONSTRAINT "ArtisanPortfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppFeedback" ADD CONSTRAINT "AppFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_reviewedId_fkey" FOREIGN KEY ("reviewedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactClickEvent" ADD CONSTRAINT "ContactClickEvent_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
