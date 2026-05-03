require("dotenv").config();
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");

const COMPANY_NAME = "Telcovas Solutions & Services";
const COMPANY_EMAIL = "telcovas@bolo237.com";
const COMPANY_LOGO_URL = "/telcovas.jpeg";

const JOB_TITLE = "Engineer Business Development Manager";
const JOB_LOCATION = "Douala";
const JOB_EXTERNAL_URL =
  "https://telcovas.snaphunt.com/job/G4C2TP79RM?source=linkedin";
const JOB_SALARY = "USD 3.000 - 4.200 / year";

const JOB_DESCRIPTION = [
  "We are seeking a motivated Engineer-cum-Sales professional to support and expand our Telecom Value Added Services (VAS) business across African markets.",
  "This position combines technical coordination, business development, and operator relationship management.",
].join("\n\n");

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

async function ensureCompany() {
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
      },
      select: { id: true, email: true, name: true },
    });
  }

  const passwordHash = await bcrypt.hash("Bolo237-Telcovas-Seed-2026!", 12);

  return prisma.user.create({
    data: {
      email: COMPANY_EMAIL,
      password: passwordHash,
      name: COMPANY_NAME,
      role: "ENTREPRISE",
      isVerified: true,
      photoUrl: COMPANY_LOGO_URL,
    },
    select: { id: true, email: true, name: true },
  });
}

async function upsertJob(authorId: number) {
  const existing = await prisma.job.findFirst({
    where: {
      authorId,
      externalApplyUrl: JOB_EXTERNAL_URL,
    },
    select: { id: true, reference: true },
  });

  const reference = existing?.reference ?? (await generateNextUniqueReference());

  const data = {
    reference,
    title: JOB_TITLE,
    titleEn: JOB_TITLE,
    company: COMPANY_NAME,
    location: JOB_LOCATION,
    salary: JOB_SALARY,
    status: "APPROVED",
    description: JOB_DESCRIPTION,
    descriptionEn: JOB_DESCRIPTION,
    externalApplyUrl: JOB_EXTERNAL_URL,
  };

  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data,
      select: { id: true, reference: true, title: true },
    });
  }

  return prisma.job.create({
    data: {
      ...data,
      authorId,
    },
    select: { id: true, reference: true, title: true },
  });
}

async function main() {
  const company = await ensureCompany();
  const job = await upsertJob(company.id);

  console.log(`✅ Offre injectee : ${job.reference} - ${job.title}`);
  console.log(`🏢 Entreprise : ${COMPANY_NAME}`);
  console.log(`🖼️ Logo : ${COMPANY_LOGO_URL}`);
  console.log(`📍 Lieu : ${JOB_LOCATION}`);
  console.log(`🔗 Candidature : ${JOB_EXTERNAL_URL}`);
}

main()
  .catch((error: unknown) => {
    console.error("[seed-telcovas] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
