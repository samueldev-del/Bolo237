require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");
const { buildBilingualJobContent } = require("../lib/translation.service");

const execFileAsync = promisify(execFile);

const INSTITUTIONS = [
  {
    name: "UNOPS",
    email: "unops@bolo237.com",
    defaultLogoUrl: "/logos/unops.png",
    passwordSeed: "Bolo237-UNOPS-Seed-2026!",
    logoBaseName: "unops",
    job: {
      title: "Administration Associate",
      sourceLanguage: "fr",
      location: "Yaoundé",
      contractType: "ICA - LICA - Support - Regular",
      externalApplyUrl:
        "https://careers.unops.org/careersmarketplace/JobDetail/Administration-Associate/2560?src=LinkedIn",
      description:
        "L'assistant administratif assure, et peut superviser, la prestation de services de soutien technique et administratif pour des processus spécialisés et généraux en administration et logistique. Fonctions : Coordination des services administratifs, logistique, gestion des actifs et des stocks, développement et partage des connaissances. Diplôme d'études secondaires avec 6 ans d'expérience ou Licence avec 2 ans d'expérience.",
    },
  },
  {
    name: "IFRC",
    email: "ifrc@bolo237.com",
    defaultLogoUrl: "/logos/ifrc.png",
    passwordSeed: "Bolo237-IFRC-Seed-2026!",
    logoBaseName: "ifrc",
    job: {
      title: "Senior Officer, National Society Investment and Localization",
      sourceLanguage: "en",
      location: "Yaounde, Cameroon",
      contractType: "National",
      externalApplyUrl: "https://careers.ifrc.org/lumesse_jobdescription.html?jobId=158489",
      description:
        "The Senior Officer will lead and coordinate the strategic planning and institutional development process of the Yaounde Delegation. Responsibilities include Strategic Planning, National Society Development support, Coordination, and Movement Engagement. Requires an Advanced university degree and 3-5 years of progressive experience in organizational development or capacity strengthening.",
    },
  },
  {
    name: "WTW",
    email: "wtw@bolo237.com",
    defaultLogoUrl: "/logos/wtw.png",
    passwordSeed: "Bolo237-WTW-Seed-2026!",
    logoBaseName: "wtw",
    job: {
      title: "Gestionnaire sinistre",
      sourceLanguage: "fr",
      location: "Littoral Region, Cameroon",
      contractType: "Full time",
      externalApplyUrl:
        "https://careers.wtwco.com/jobs/gestionnaire-sinistre-littoral-region-cameroon-b74bda84-d603-4d92-acb1-ee727c4453b7?source=linkedin",
      description:
        "Dans le cadre du développement de nos activités au Cameroun, nous recherchons un(e) Gestionnaire Sinistres chargé(e) d’assurer la gestion complète des dossiers sinistres. Missions : Assurer la gestion complète des sinistres, garantir un traitement rigoureux et conforme, assurer une relation client de qualité. Exigences : Bac+3 minimum en assurance, droit ou gestion, expérience confirmée.",
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

  const reference = formatJobReference(referenceCursor);
  referenceCursor += 1;
  return reference;
}

async function convertSvgToPng(sourceFile, targetFile) {
  await execFileAsync("sips", ["-s", "format", "png", sourceFile, "--out", targetFile]);
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
    path.join(repoRoot, "frontend", "public", `${logoBaseName}.svg`),
    path.join(repoRoot, "frontend", "public", "logos", `${logoBaseName}.png`),
    path.join(repoRoot, "frontend", "public", "logos", `${logoBaseName}.jpg`),
    path.join(repoRoot, "frontend", "public", "logos", `${logoBaseName}.jpeg`),
    path.join(repoRoot, "frontend", "public", "logos", `${logoBaseName}.webp`),
    path.join(repoRoot, "frontend", "public", "logos", `${logoBaseName}.svg`),
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

  if (path.extname(sourceFile).toLowerCase() === ".svg") {
    await convertSvgToPng(sourceFile, targetPng);
    return defaultLogoUrl;
  }

  if (path.resolve(sourceFile) !== path.resolve(targetPng)) {
    await fs.copyFile(sourceFile, targetPng);
  }

  return defaultLogoUrl;
}

async function ensureInstitution(institutionConfig) {
  const logoPath = await resolveLogoFile(institutionConfig.logoBaseName, institutionConfig.defaultLogoUrl);

  const passwordHash = await bcrypt.hash(institutionConfig.passwordSeed, 12);

  return prisma.user.upsert({
    where: { email: institutionConfig.email },
    update: {
      name: institutionConfig.name,
      role: "ENTREPRISE",
      isVerified: true,
      photoUrl: logoPath,
      password: passwordHash,
    },
    create: {
      email: institutionConfig.email,
      password: passwordHash,
      name: institutionConfig.name,
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

async function upsertInstitutionJob(company, job) {
  const localized = await buildBilingualJobContent({
    title: job.title,
    description: buildSeedDescription(job),
    sourceLanguage: job.sourceLanguage,
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
  console.log("Seed institutions TS: demarrage...");

  for (const institutionConfig of INSTITUTIONS) {
    const company = await ensureInstitution(institutionConfig);
    const result = await upsertInstitutionJob(company, institutionConfig.job);
    console.log(`OK ${result.mode}: ${result.job.reference} - ${result.job.titleEn} ajoute pour ${company.name}`);
  }
}

main()
  .catch((error) => {
    console.error("[seed-institutions:ts] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });