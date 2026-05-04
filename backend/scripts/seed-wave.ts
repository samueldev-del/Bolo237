require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");
const { buildBilingualJobContent } = require("../lib/translation.service");

const COMPANY_NAME = "Wave Mobile Money";
const COMPANY_EMAIL = "wave-mobile-money@bolo237.com";
const DEFAULT_COMPANY_LOGO_URL = "/logos/wave.png";

const WAVE_JOB = {
  title: "Field Officer",
  location: "Yaounde, Bafoussam, Bertoua, Maroua/Kaele (Cameroun)",
  contractType: "6 months fixed-term contract (Temps plein)",
  externalApplyUrl: "https://www.wave.com/en/careers/job/5797531004/?source=LinkedIn",
  description:
    "We are looking for field officers to manage product rollouts as we launch our business in Cameroon. You will identify and build a local agent network, recruit target users and onboard them on the use of Wave products. You will monitor cash and float availability, ensure agent quality, and champion excellent customer service. Requirements: Fluent French, at least 2 years of relevant work experience managing an agent network.",
};

function formatJobReference(index) {
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

async function ensureWaveLogoFile() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const targetDir = path.join(repoRoot, "frontend", "public", "logos");
  const targetFile = path.join(targetDir, "wave.png");

  const candidateSources = [
    path.join(repoRoot, "frontend", "public", "wave.png"),
    path.join(repoRoot, "frontend", "public", "logos", "wave.png"),
    path.join(repoRoot, "wave.png"),
    targetFile,
  ];

  let sourceFile = null;
  for (const file of candidateSources) {
    try {
      await fs.access(file);
      sourceFile = file;
      break;
    } catch {
      // continue
    }
  }

  if (!sourceFile) {
    throw new Error("Logo Wave introuvable. Fichier attendu: frontend/public/wave.png");
  }

  await fs.mkdir(targetDir, { recursive: true });
  if (path.resolve(sourceFile) !== path.resolve(targetFile)) {
    await fs.copyFile(sourceFile, targetFile);
  }

  return DEFAULT_COMPANY_LOGO_URL;
}

async function ensureCompanyUser() {
  const logoPath = await ensureWaveLogoFile();

  const existing = await prisma.user.findUnique({
    where: { email: COMPANY_EMAIL },
    select: { id: true, photoUrl: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: COMPANY_NAME,
        role: "ENTREPRISE",
        isVerified: true,
        photoUrl: String(existing.photoUrl || "").trim() || logoPath,
      },
      select: { id: true, email: true, name: true },
    });
  }

  const passwordHash = await bcrypt.hash("Bolo237-Wave-Seed-2026!", 12);

  return prisma.user.create({
    data: {
      email: COMPANY_EMAIL,
      password: passwordHash,
      name: COMPANY_NAME,
      role: "ENTREPRISE",
      isVerified: true,
      photoUrl: logoPath,
    },
    select: { id: true, email: true, name: true },
  });
}

function buildSeedDescription(job) {
  return [job.description, "", `Contract type: ${job.contractType}`].join("\n\n");
}

async function upsertWaveJob(authorId, job) {
  const localized = await buildBilingualJobContent({
    title: job.title,
    description: buildSeedDescription(job),
    sourceLanguage: "en",
  });

  const existing = await prisma.job.findFirst({
    where: {
      authorId,
      externalApplyUrl: job.externalApplyUrl,
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
    location: job.location,
    description: localized.description_fr,
    descriptionFr: localized.descriptionFr,
    descriptionEn: localized.descriptionEn,
    description_fr: localized.description_fr,
    description_en: localized.description_en,
    salary: job.contractType,
    externalApplyUrl: job.externalApplyUrl,
    status: "APPROVED",
  };

  if (existing) {
    const updated = await prisma.job.update({
      where: { id: existing.id },
      data: payload,
      select: { reference: true, titleEn: true },
    });
    return { mode: "updated", job: updated };
  }

  const created = await prisma.job.create({
    data: {
      ...payload,
      authorId,
    },
    select: { reference: true, titleEn: true },
  });
  return { mode: "created", job: created };
}

async function main() {
  console.log("Seed Wave TS: demarrage...");

  const company = await ensureCompanyUser();
  const result = await upsertWaveJob(company.id, WAVE_JOB);

  console.log(`OK ${result.mode}: ${result.job.reference} - ${result.job.titleEn} ajoute pour Wave`);
}

main()
  .catch((error) => {
    console.error("[seed-wave:ts] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
