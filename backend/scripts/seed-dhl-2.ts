require("dotenv").config();
const bcrypt = require("bcryptjs");
const { prisma, pool } = require("../lib/db");
const { buildBilingualJobContent } = require("../lib/translation.service");

const COMPANY_NAME = "DHL Global Forwarding";
const COMPANY_EMAIL = "dhl-global-forwarding@bolo237.com";
const DEFAULT_COMPANY_LOGO_URL = "/logos/dhl-group.png";

const DHL_JOBS = [
  {
    title: "Head of Road Freight",
    location: "Douala, Littoral, Cameroon",
    contractType: "Full-time, Permanent",
    externalApplyUrl:
      "https://careers.dhl.com/global/en/job/DPDHGLOBALAV347623ENGLOBALEXTERNAL/Head-of-Road-Freight",
    description:
      "DHL Global Forwarding has an opening for Head of Road Freight in Cameroon. In this role, you will participate in the design and ensure the implementation of customer operations strategy to deliver efficient logistics processes using multimodal means of transportation. You will manage the flow of goods across a customer's global supply chain. Experience Level: more than 6 years in road freight and logistics. Education Level: Bachelors Degree.",
  },
  {
    title: "Junior Accountant trainee",
    location: "Douala, Littoral, Cameroon",
    contractType: "Full-time, Temporary",
    externalApplyUrl:
      "https://careers.dhl.com/global/en/job/DPDHGLOBALAV349087ENGLOBALEXTERNAL/Junior-Accountant-trainee",
    description:
      "DHL Global Forwarding has an opening for Junior Accountant trainee in Cameroon. In this role, you will support the Finance team with daily accounting tasks, including preparing journal entries, reconciling accounts, processing supplier/customer invoices, and assisting with month-end and year-end closing activities. Bachelor's degree in Accounting, Finance, or a related field required. Basic understanding of IFRS is a plus.",
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

async function ensureCompanyUser() {
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
        photoUrl: String(existing.photoUrl || "").trim() || DEFAULT_COMPANY_LOGO_URL,
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
      photoUrl: DEFAULT_COMPANY_LOGO_URL,
    },
    select: { id: true, email: true, name: true },
  });
}

function buildSeedDescription(job) {
  return [job.description, "", `Contract type: ${job.contractType}`].join("\n\n");
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
  console.log("Seed DHL 2 TS: demarrage...");

  const company = await ensureCompanyUser();
  console.log(`Entreprise DHL prete: ${company.name} (${company.email})`);

  for (const jobData of DHL_JOBS) {
    const result = await upsertDhlJob(company.id, jobData);
    console.log(`OK ${result.mode}: ${result.job.reference} - ${result.job.titleEn}`);
  }
}

main()
  .catch((error) => {
    console.error("[seed-dhl-2:ts] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
