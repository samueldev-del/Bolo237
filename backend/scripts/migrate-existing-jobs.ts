require("dotenv").config();
const { prisma, pool } = require("../lib/db");
const { buildBilingualJobContent } = require("../lib/translation.service");

function pickFirst(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

async function main() {
  const jobs = await prisma.job.findMany({
    select: {
      id: true,
      title: true,
      titleFr: true,
      titleEn: true,
      title_fr: true,
      title_en: true,
      description: true,
      descriptionFr: true,
      descriptionEn: true,
      description_fr: true,
      description_en: true,
    },
  });

  let updatedCount = 0;
  let skippedCount = 0;

  for (const job of jobs) {
    const sourceTitle = pickFirst(job.title_fr, job.titleFr, job.title_en, job.titleEn, job.title);
    const sourceDescription = pickFirst(
      job.description_fr,
      job.descriptionFr,
      job.description_en,
      job.descriptionEn,
      job.description
    );

    if (!sourceTitle || !sourceDescription) {
      skippedCount += 1;
      continue;
    }

    const localized = await buildBilingualJobContent({
      title: sourceTitle,
      description: sourceDescription,
    });

    const hasBothNewFields =
      String(job.title_fr || "").trim() &&
      String(job.title_en || "").trim() &&
      String(job.description_fr || "").trim() &&
      String(job.description_en || "").trim();

    if (hasBothNewFields) {
      skippedCount += 1;
      continue;
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        // Legacy fields
        title: localized.title_fr,
        titleFr: localized.titleFr,
        titleEn: localized.titleEn,
        description: localized.description_fr,
        descriptionFr: localized.descriptionFr,
        descriptionEn: localized.descriptionEn,
        // New bilingual fields
        title_fr: localized.title_fr,
        title_en: localized.title_en,
        description_fr: localized.description_fr,
        description_en: localized.description_en,
      },
    });

    updatedCount += 1;
  }

  console.log(`Migration jobs bilingues terminee: ${updatedCount} mis a jour, ${skippedCount} ignores.`);
}

main()
  .catch((error: unknown) => {
    console.error("[migrate-existing-jobs] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
