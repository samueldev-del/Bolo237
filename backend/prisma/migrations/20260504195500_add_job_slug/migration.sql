ALTER TABLE "Job"
ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");