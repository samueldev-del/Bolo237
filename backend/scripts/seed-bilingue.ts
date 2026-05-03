require("dotenv").config();
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");
const { buildBilingualJobContent } = require("../lib/translation.service");

const COMPANY_NAME = "Bolo237 International";
const COMPANY_EMAIL = "intl@bolo237.com";
const COMPANY_LOGO_URL = "/logos/bolo237-international.png";

const RAW_OFFER = {
  title: "Engineer Business Development Manager",
  location: "Douala",
  description: [
    "We are seeking a motivated Engineer-cum-Sales professional to support and expand our Telecom Value Added Services (VAS) business across African markets.",
    "This position combines technical coordination, business development, and operator relationship management.",
    "- Manage telecom operator partnerships",
    "- Coordinate technical roll-outs",
    "- Report market opportunities",
  ].join("\n"),
  externalApplyUrl: "https://example.com/jobs/bolo237-intl-business-dev-manager",
};

function formatJobReference(index: number) {
  return `BOLO-${String(index).padStart(4, "0")}`;
}

async function generateNextUniqueReference() {
  const jobsCount = await prisma.job.count();
  let nextIndex = jobsCount + 1;
  let candidate = formatJobReference(nextIndex);

  while (await prisma.job.findUnique({ where: { reference: candidate } })) {
    nextIndex += 1;
    candidate = formatJobReference(nextIndex);
  }

  return candidate;
}

async function ensureCompanyUser() {
  const existing = await prisma.user.findUnique({
    where: { email: COMPANY_EMAIL },
    select: { id: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: COMPANY_NAME,
        role: "ENTREPRISE",
        isVerified: true,
        photoUrl: COMPANY_LOGO_URL,
        bio_fr: "Entreprise partenaire orientee innovation et developpement international.",
        bio_en: "Partner company focused on innovation and international growth.",
      },
      select: { id: true, email: true, name: true },
    });
  }

  const passwordHash = await bcrypt.hash("Bolo237-Bilingual-Seed-2026!", 12);

  return prisma.user.create({
    data: {
      email: COMPANY_EMAIL,
      password: passwordHash,
      name: COMPANY_NAME,
      role: "ENTREPRISE",
      isVerified: true,
      photoUrl: COMPANY_LOGO_URL,
      bio_fr: "Entreprise partenaire orientee innovation et developpement international.",
      bio_en: "Partner company focused on innovation and international growth.",
    },
    select: { id: true, email: true, name: true },
  });
}

async function upsertBilingualJob(authorId: number) {
  const localized = await buildBilingualJobContent({
    title: RAW_OFFER.title,
    description: RAW_OFFER.description,
  });

  const existing = await prisma.job.findFirst({
    where: {
      authorId,
      externalApplyUrl: RAW_OFFER.externalApplyUrl,
    },
    select: { id: true, reference: true },
  });

  const reference = existing?.reference ?? (await generateNextUniqueReference());

  const payload = {
    reference,
    title: localized.title_fr,
    titleFr: localized.titleFr,
    titleEn: localized.titleEn,
    title_fr: localized.title_fr,
    title_en: localized.title_en,
    company: COMPANY_NAME,
    location: RAW_OFFER.location,
    description: localized.description_fr,
    descriptionFr: localized.descriptionFr,
    descriptionEn: localized.descriptionEn,
    description_fr: localized.description_fr,
    description_en: localized.description_en,
    status: "APPROVED",
    externalApplyUrl: RAW_OFFER.externalApplyUrl,
  };

  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data: payload,
      select: { id: true, reference: true, titleFr: true, titleEn: true },
    });
  }

  return prisma.job.create({
    data: {
      ...payload,
      authorId,
    },
    select: { id: true, reference: true, titleFr: true, titleEn: true },
  });
}

async function main() {
  const company = await ensureCompanyUser();
  const job = await upsertBilingualJob(company.id);

  console.log("+-------------------------------------------------------------+");
  console.log("| Seed bilingue termine                                     |");
  console.log(`| Reference: ${String(job.reference).padEnd(48, " ")}|`);
  console.log(`| Titre FR : ${String(job.titleFr || "").slice(0, 47).padEnd(47, " ")}|`);
  console.log(`| Title EN : ${String(job.titleEn || "").slice(0, 47).padEnd(47, " ")}|`);
  console.log("+-------------------------------------------------------------+");
}

main()
  .catch((error: unknown) => {
    console.error("[seed-bilingue] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
