ALTER TABLE "Job"
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "sourceHash" TEXT,
ADD COLUMN "outreachEmailSentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Job_sourceHash_key" ON "Job"("sourceHash");