-- CreateEnum
CREATE TYPE "JobAlertFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "Job"
ADD COLUMN "applyClickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Application"
ALTER COLUMN "status" SET DEFAULT 'APPLIED';

-- DataMigration
UPDATE "Application"
SET "status" = CASE
  WHEN "status" = 'PENDING' THEN 'APPLIED'
  WHEN "status" = 'REVIEWED' THEN 'REVIEWING'
  WHEN "status" = 'ACCEPTED' THEN 'HIRED'
  ELSE "status"
END;

-- CreateTable
CREATE TABLE "JobAlert" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "keywords" TEXT NOT NULL,
    "location" TEXT,
    "frequency" "JobAlertFrequency" NOT NULL DEFAULT 'DAILY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobAlert_userId_isActive_frequency_idx" ON "JobAlert"("userId", "isActive", "frequency");

-- CreateIndex
CREATE INDEX "JobAlert_createdAt_idx" ON "JobAlert"("createdAt");

-- CreateIndex
CREATE INDEX "JobAlert_keywords_trgm_idx" ON "JobAlert" USING GIN ("keywords" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "JobAlert_location_trgm_idx" ON "JobAlert" USING GIN ("location" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;