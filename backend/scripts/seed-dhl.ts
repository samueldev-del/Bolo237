require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");
const { buildBilingualJobContent } = require("../lib/translation.service");

const COMPANY_NAME = "DHL Global Forwarding";
const COMPANY_EMAIL = "dhl-global-forwarding@bolo237.com";
const COMPANY_LOGO_URL = "/logos/dhl-group.png";

const DHL_JOBS = [
  {
    title: "CDZ TEAM LEADER",
    location: "Douala, Littoral, Cameroon",
    contractType: "Full-time, Permanent",
    externalApplyUrl:
      "https://careers.dhl.com/global/en/job/DPDHGLOBALAV347638ENGLOBALEXTERNAL/CDZ-TEAM-LEADER",
    description:
      "DHL Global Forwarding has an opening for CDZ TEAM LEADER in Cameroon. You will execute customs and trade compliance plans and processes to optimize service and cost performance in customs clearance activities. You will execute customs entries, categorize goods, calculate duties, tariffs, and resolve customer issues. Education: Bachelor's Degree. Experience: more than 4 years.",
  },
  {
    title: "Head of Sales Cameroon",
    location: "Douala, Littoral, Cameroon",
    contractType: "Full-time, TemporaryLocation",
    externalApplyUrl:
      "https://careers.dhl.com/global/en/job/DPDHGLOBALAV339858ENGLOBALEXTERNAL/Head-of-Sales-Cameroon",
    description:
      "DHL Global Forwarding has an opening for Head of Sales in Cameroon. You will define the sales strategy for the country, cascade it, and monitor the delivery of sales objectives. You will drive market acquisition and retention strategies to maximize sales growth in the country and optimize profits. Experience: more than 10 years in logistics industry.",
  },
];

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

async function ensureDhlLogoFile() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const targetDir = path.join(repoRoot, "frontend", "public", "logos");
  const targetFile = path.join(targetDir, "dhl-group.png");

  const candidateSources = [
    path.join(repoRoot, "frontend", "public", "dhl.png"),
    path.join(repoRoot, "frontend", "public", "companies", "dhl.png"),
    path.join(repoRoot, "dhl.png"),
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
    throw new Error('Logo DHL introuvable. Fichier attendu: frontend/public/dhl.png ou frontend/public/companies/dhl.png');
  }

  await fs.mkdir(targetDir, { recursive: true });
  if (path.resolve(sourceFile) !== path.resolve(targetFile)) {
    await fs.copyFile(sourceFile, targetFile);
  }

  return COMPANY_LOGO_URL;
}

async function ensureCompany(logoPath) {
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
        photoUrl: logoPath,
      },
      select: { id: true, email: true, name: true },
    });
  }

  const passwordHash = await bcrypt.hash("Bolo237-DHL-Seed-2026!", 12);

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
  return [
    job.description,
    "",
    `Contract type: ${job.contractType}`,
  ].join("\n\n");
}

async function upsertDhlJob(authorId, job) {
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
  console.log("Seed DHL TS: demarrage...");

  const logoPath = await ensureDhlLogoFile();
  const company = await ensureCompany(logoPath);

  console.log(`Entreprise DHL prete: ${company.name} (${company.email})`);

  for (const jobData of DHL_JOBS) {
    const result = await upsertDhlJob(company.id, jobData);
    console.log(`OK ${result.mode}: ${result.job.reference} - ${result.job.titleEn}`);
  }
}

main()
  .catch((error) => {
    console.error("[seed-dhl:ts] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
