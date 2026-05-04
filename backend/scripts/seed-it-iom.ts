require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");
const { buildBilingualJobContent } = require("../lib/translation.service");

const COMPANIES = [
  {
    name: "ITProposal",
    email: "itproposal@bolo237.com",
    defaultLogoUrl: "/logos/itproposal.png",
    passwordSeed: "Bolo237-ITProposal-Seed-2026!",
    logoBaseName: "itproposal",
    job: {
      title: "Nutanix Engineer / Networking IT Support Engineer",
      location: "Douala, Yaounde. CAMEROON",
      contractType: "Freelance (On-Call Basis)",
      externalApplyUrl:
        "https://www.careers-page.com/itproposal/job/RY7VY776?utm_medium=free_job_board&utm_source=linkedin",
      description:
        "We are hiring a Nutanix Engineer/ Networking IT Support Engineer to support enterprise infrastructure environments. Key Responsibilities: Deploy and manage Nutanix HCI environments (AOS, AHV, Prism), perform upgrades, patching, and lifecycle management. Implement backup and disaster recovery solutions. Required Skills: 5+ years in infrastructure or virtualization engineering, strong experience with Nutanix stack, Networking fundamentals (TCP/IP, VLANs, DNS, DHCP).",
    },
  },
  {
    name: "International Organization for Migration (IOM)",
    email: "iom-cameroon@bolo237.com",
    defaultLogoUrl: "/logos/iom.png",
    passwordSeed: "Bolo237-IOM-Seed-2026!",
    logoBaseName: "iom",
    job: {
      title: "Migration Health Project Officer (P)",
      location: "Yaounde, Cameroon",
      contractType: "Special Short Term Graded (Up to 9 months)",
      externalApplyUrl:
        "https://fa-evlj-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/20148?utm_medium=jobboard&utm_source=linkedin",
      description:
        "IOM Cameroon is expanding its engagement on migration and health. The Migration Health Project Officer will be responsible for supporting the timely implementation of activities, and team supervision of IOM Cameroon’s public health department’s implementation team. Qualifications: Master’s degree in Public Health or related field with two years of relevant professional experience. Fluency in English and French is required.",
    },
  },
];

function formatJobReference(index) {
  return `BOLO-${String(index).padStart(4, "0")}`;
}

let referenceCursor = null;
async function generateNextSequentialReference() {
  if (referenceCursor === null) {
    const jobsCount = await prisma.job.count();
    referenceCursor = jobsCount + 1;
  }

  while (await prisma.job.findUnique({ where: { reference: formatJobReference(referenceCursor) } })) {
    referenceCursor += 1;
  }

  const nextReference = formatJobReference(referenceCursor);
  referenceCursor += 1;
  return nextReference;
}

async function resolveLogoFile(logoBaseName, defaultLogoUrl) {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const targetDir = path.join(repoRoot, "frontend", "public", "logos");
  const targetPng = path.join(targetDir, `${logoBaseName}.png`);

  const candidates = [
    path.join(repoRoot, "frontend", "public", `${logoBaseName}.png`),
    path.join(repoRoot, "frontend", "public", `${logoBaseName}.jpg`),
    path.join(repoRoot, "frontend", "public", `${logoBaseName}.jpeg`),
    path.join(repoRoot, "frontend", "public", `${logoBaseName}.webp`),
    path.join(repoRoot, "frontend", "public", "logos", `${logoBaseName}.png`),
    path.join(repoRoot, "frontend", "public", "logos", `${logoBaseName}.jpg`),
    path.join(repoRoot, "frontend", "public", "logos", `${logoBaseName}.jpeg`),
    path.join(repoRoot, "frontend", "public", "logos", `${logoBaseName}.webp`),
    targetPng,
  ];

  let sourceFile = null;
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      sourceFile = candidate;
      break;
    } catch {
      // continue
    }
  }

  if (!sourceFile) {
    return defaultLogoUrl;
  }

  await fs.mkdir(targetDir, { recursive: true });
  if (path.resolve(sourceFile) !== path.resolve(targetPng)) {
    await fs.copyFile(sourceFile, targetPng);
  }

  return defaultLogoUrl;
}

async function ensureCompany(companyConfig) {
  const logoPath = await resolveLogoFile(companyConfig.logoBaseName, companyConfig.defaultLogoUrl);
  const existing = await prisma.user.findUnique({
    where: { email: companyConfig.email },
    select: { id: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: companyConfig.name,
        role: "ENTREPRISE",
        isVerified: true,
        photoUrl: logoPath,
      },
      select: { id: true, name: true, email: true },
    });
  }

  const passwordHash = await bcrypt.hash(companyConfig.passwordSeed, 12);
  return prisma.user.create({
    data: {
      email: companyConfig.email,
      password: passwordHash,
      name: companyConfig.name,
      role: "ENTREPRISE",
      isVerified: true,
      photoUrl: logoPath,
    },
    select: { id: true, name: true, email: true },
  });
}

function buildSeedDescription(job) {
  return [job.description, "", `Contract type: ${job.contractType}`].join("\n\n");
}

async function upsertJob(company, job) {
  const localized = await buildBilingualJobContent({
    title: job.title,
    description: buildSeedDescription(job),
    sourceLanguage: "en",
  });

  const existing = await prisma.job.findFirst({
    where: {
      authorId: company.id,
      externalApplyUrl: job.externalApplyUrl,
    },
    select: { id: true, reference: true },
  });

  const reference = existing?.reference ?? (await generateNextSequentialReference());
  const payload = {
    reference,
    title: localized.title_fr,
    titleFr: localized.titleFr,
    titleEn: localized.titleEn,
    title_fr: localized.title_fr,
    title_en: localized.title_en,
    company: company.name,
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
      authorId: company.id,
    },
    select: { reference: true, titleEn: true },
  });
  return { mode: "created", job: created };
}

async function main() {
  console.log("Seed IT + IOM TS: demarrage...");

  for (const companyConfig of COMPANIES) {
    const company = await ensureCompany(companyConfig);
    const result = await upsertJob(company, companyConfig.job);
    console.log(`OK ${result.mode}: ${result.job.reference} - ${result.job.titleEn} ajoute pour ${company.name}`);
  }
}

main()
  .catch((error) => {
    console.error("[seed-it-iom:ts] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });