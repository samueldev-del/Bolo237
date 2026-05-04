require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");
const { buildBilingualJobContent } = require("../lib/translation.service");

const COMPANY_NAME = "TalentWorldGroup Plc.";
const COMPANY_EMAIL = "talentworldgroup@bolo237.com";
const DEFAULT_COMPANY_LOGO_URL = "/logos/talentworldgroup.png";

const TWG_JOB = {
  title: "German Sales Consultant (L1) - Remote",
  location: "100% Remote (Europe/Budapest +/- 4)",
  contractType: "Contract / Part Time (Freelance)",
  salary: "EUR 13.200 - 14.400 / year",
  externalApplyUrl: "https://talentworldgroup.snaphunt.com/job/XPWHVBY6TY-CM-34?source=linkedin",
  description:
    "We are hiring a German-speaking Sales Consultant to support a client in the industrial components distribution sector. This is a customer-facing role focused on outbound B2B sales activity, lead qualification, and appointment setting. Working Hours: Monday to Friday, 3 to 4 hours per day. Requirements: German C2, English Good working level, previous experience in B2B sales or outbound calling. Freelance cooperation agreement, fully remote.",
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

async function resolveTalentWorldLogo() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const targetDir = path.join(repoRoot, "frontend", "public", "logos");
  const targetPng = path.join(targetDir, "talentworldgroup.png");

  const candidates = [
    path.join(repoRoot, "frontend", "public", "talentworldgroup.png"),
    path.join(repoRoot, "frontend", "public", "talentworldgroup.jpg"),
    path.join(repoRoot, "frontend", "public", "talentworldgroup.jpeg"),
    path.join(repoRoot, "frontend", "public", "talentworldgroup.webp"),
    path.join(repoRoot, "frontend", "public", "logos", "talentworldgroup.png"),
    path.join(repoRoot, "frontend", "public", "logos", "talentworldgroup.jpg"),
    path.join(repoRoot, "frontend", "public", "logos", "talentworldgroup.jpeg"),
    path.join(repoRoot, "frontend", "public", "logos", "talentworldgroup.webp"),
    targetPng,
  ];

  let found = null;
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      found = candidate;
      break;
    } catch {
      // continue
    }
  }

  if (!found) {
    return DEFAULT_COMPANY_LOGO_URL;
  }

  await fs.mkdir(targetDir, { recursive: true });
  if (path.resolve(found) !== path.resolve(targetPng)) {
    await fs.copyFile(found, targetPng);
  }

  return DEFAULT_COMPANY_LOGO_URL;
}

async function ensureCompanyUser() {
  const logoPath = await resolveTalentWorldLogo();

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
      select: { id: true, email: true, name: true, photoUrl: true },
    });
  }

  const passwordHash = await bcrypt.hash("Bolo237-TWG-Seed-2026!", 12);

  return prisma.user.create({
    data: {
      email: COMPANY_EMAIL,
      password: passwordHash,
      name: COMPANY_NAME,
      role: "ENTREPRISE",
      isVerified: true,
      photoUrl: logoPath,
    },
    select: { id: true, email: true, name: true, photoUrl: true },
  });
}

function buildSeedDescription(job) {
  return [
    job.description,
    "",
    `Working model: ${job.contractType}`,
    `Indicative salary: ${job.salary}`,
  ].join("\n\n");
}

async function upsertTwgJob(authorId, job) {
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
    salary: job.salary,
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
  console.log("Seed TWG TS: demarrage...");

  const company = await ensureCompanyUser();
  const result = await upsertTwgJob(company.id, TWG_JOB);

  console.log(`OK ${result.mode}: ${result.job.reference} - ${result.job.titleEn} ajoute pour TalentWorldGroup`);
}

main()
  .catch((error) => {
    console.error("[seed-twg:ts] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
