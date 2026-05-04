require("dotenv").config();
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");
const { buildBilingualJobContent } = require("../lib/translation.service");

const COMPANY_NAME = "Ambassade de France au Cameroun";
const COMPANY_EMAIL = "ambassade-france@bolo237.com";
const DEFAULT_COMPANY_LOGO_URL = "/logos/ambassade-france.png";

const JOB_TITLE = "Agent Affaires diverses de chancellerie (F/H)";
const JOB_LOCATION = "Yaounde - Cameroun (Service etat civil - Section consulaire)";
const JOB_EXTERNAL_URL =
  "https://emplois.diplomatie.gouv.fr/nos-offres/c9828a22-afb4-436a-b7f1-a31c48f8ce72";
const JOB_DESCRIPTION =
  "Animer l'accueil physique des demandeurs en matiere d'etat civil et de nationalite. Prodiguer des conseils d'ordre pratique et juridique sous l'autorite de la section consulaire et du chef de chancellerie. Faire les auditions de mariage, de PACS et les entretiens de demandes de nationalite, rediger les PACS et les declarations de nationalite (21-2, 21-26, 21-13). Transcrire ou dresser les actes, les exploiter ; verifier les pieces necessaires a la constitution des dossiers d'etat civil et les instruire.";

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

async function ensureCompanyUser() {
  const existing = await prisma.user.findUnique({
    where: { email: COMPANY_EMAIL },
    select: { id: true, email: true, photoUrl: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: COMPANY_NAME,
        role: "ENTREPRISE",
        isVerified: true,
        photoUrl: existing.photoUrl || DEFAULT_COMPANY_LOGO_URL,
      },
      select: { id: true, email: true, photoUrl: true },
    });
  }

  const passwordHash = await bcrypt.hash("Ambassade-Bolo237-Seed-2026!", 12);

  return prisma.user.create({
    data: {
      email: COMPANY_EMAIL,
      password: passwordHash,
      name: COMPANY_NAME,
      role: "ENTREPRISE",
      isVerified: true,
      photoUrl: DEFAULT_COMPANY_LOGO_URL,
    },
    select: { id: true, email: true, photoUrl: true },
  });
}

async function upsertAmbassadeJob(authorId) {
  const localized = await buildBilingualJobContent({
    title: JOB_TITLE,
    description: JOB_DESCRIPTION,
    sourceLanguage: "fr",
  });

  const existing = await prisma.job.findFirst({
    where: {
      authorId,
      externalApplyUrl: JOB_EXTERNAL_URL,
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
    location: JOB_LOCATION,
    description: localized.description_fr,
    descriptionFr: localized.descriptionFr,
    descriptionEn: localized.descriptionEn,
    description_fr: localized.description_fr,
    description_en: localized.description_en,
    externalApplyUrl: JOB_EXTERNAL_URL,
    status: "APPROVED",
  };

  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data: payload,
      select: { reference: true, titleFr: true },
    });
  }

  return prisma.job.create({
    data: {
      ...payload,
      authorId,
    },
    select: { reference: true, titleFr: true },
  });
}

async function main() {
  const company = await ensureCompanyUser();
  const job = await upsertAmbassadeJob(company.id);

  console.log(`OK ${job.reference} - ${job.titleFr}`);
}

main()
  .catch((error) => {
    console.error("[seed-ambassade-2] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
