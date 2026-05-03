require("dotenv").config();
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");


const COMPANY_NAME = "Ambassade de France au Cameroun";
const COMPANY_EMAIL = "ambassade-france@bolo237.com";
const COMPANY_LOGO_URL = "/logos/ambassade-france.png";

const JOB_TITLE = "AGENT VISAS (F/H)";
const JOB_LOCATION = "Yaounde, Cameroun (Consulat general de France)";
const JOB_EXTERNAL_URL =
  "https://emplois.diplomatie.gouv.fr/nos-offres/320cce4a-3f01-401b-b75d-70b463f6e519";

const JOB_DESCRIPTION = [
  "Effectuer, sous l'autorite du Consul general et du chef de service des visas,",
  "la verification, le traitement et l'instruction des dossiers de demandes de visas.",
  "",
  "Activites principales:",
  "- Verification des dossiers",
  "- Controle documentaire",
  "- Gestion de bases de donnees",
].join("\n");

function formatJobReference(index: number) {
  return `BOLO-${String(index).padStart(4, "0")}`;
}

async function generateNextUniqueReference() {
  const jobsCount = await prisma.job.count();
  let nextIndex = jobsCount + 1;
  let candidate = formatJobReference(nextIndex);

  // Keep incrementing in case BOLO-XXXX already exists.
  while (await prisma.job.findUnique({ where: { reference: candidate } })) {
    nextIndex += 1;
    candidate = formatJobReference(nextIndex);
  }

  return candidate;
}

async function ensureCompanyUser() {
  const existing = await prisma.user.findUnique({
    where: { email: COMPANY_EMAIL },
    select: { id: true, email: true, name: true, role: true, photoUrl: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: COMPANY_NAME,
        role: "ENTREPRISE",
        isVerified: true, // Equivalent business flag for "isCertified" in current schema.
        photoUrl: COMPANY_LOGO_URL,
      },
      select: { id: true, email: true, name: true },
    });
  }

  const passwordHash = await bcrypt.hash("Ambassade-Bolo237-Seed-2026!", 12);

  return prisma.user.create({
    data: {
      email: COMPANY_EMAIL,
      password: passwordHash,
      name: COMPANY_NAME,
      role: "ENTREPRISE",
      isVerified: true, // Equivalent business flag for "isCertified" in current schema.
      photoUrl: COMPANY_LOGO_URL,
    },
    select: { id: true, email: true, name: true },
  });
}

async function upsertPrestigiousJob(authorId: number) {
  const existing = await prisma.job.findFirst({
    where: {
      authorId,
      externalApplyUrl: JOB_EXTERNAL_URL,
    },
    select: { id: true, reference: true },
  });

  const reference = existing?.reference ?? (await generateNextUniqueReference());

  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data: {
        title: JOB_TITLE,
        titleFr: JOB_TITLE,
        company: COMPANY_NAME,
        location: JOB_LOCATION,
        description: JOB_DESCRIPTION,
        descriptionFr: JOB_DESCRIPTION,
        status: "APPROVED",
        externalApplyUrl: JOB_EXTERNAL_URL,
      },
      select: { id: true, reference: true, title: true },
    });
  }

  return prisma.job.create({
    data: {
      reference,
      title: JOB_TITLE,
      titleFr: JOB_TITLE,
      company: COMPANY_NAME,
      location: JOB_LOCATION,
      description: JOB_DESCRIPTION,
      descriptionFr: JOB_DESCRIPTION,
      status: "APPROVED",
      externalApplyUrl: JOB_EXTERNAL_URL,
      authorId,
    },
    select: { id: true, reference: true, title: true },
  });
}

async function main() {
  const company = await ensureCompanyUser();
  const job = await upsertPrestigiousJob(company.id);

  console.log("\n+------------------------------------------------------------+");
  console.log("|  Bolo237 Seed Success: Ambassade job injected            |");
  console.log("+------------------------------------------------------------+");
  console.log(` Company   : ${COMPANY_NAME}`);
  console.log(` Logo URL  : ${COMPANY_LOGO_URL}`);
  console.log(` Job title : ${job.title}`);
  console.log(` Ref       : ${job.reference}`);
  console.log(` Location  : ${JOB_LOCATION}`);
  console.log(` Apply URL : ${JOB_EXTERNAL_URL}`);
  console.log("+------------------------------------------------------------+\n");
}

main()
  .catch((error) => {
    console.error("[seed-ambassade] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
