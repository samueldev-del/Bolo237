#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dns = require('node:dns').promises;
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const backendRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(backendRoot, '.env.local') });
dotenv.config({ path: path.join(backendRoot, '.env') });

const { prisma, pool } = require('../lib/db');
const { translateText } = require('../services/translation.service');

const INPUT_FILE = path.join(backendRoot, 'data', 'manual-jobs.json');
const DEFAULT_BOT_EMAIL = 'bot-sourcing@bolo237.com';
const BOT_NAME = 'Bolo237 Sourcing Bot';
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SOURCE_TYPE = 'EXTERNAL';

function parseArgs(argv) {
  return new Set(argv.slice(2));
}

function assertNonEmptyString(value, label, index) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Entry #${index + 1}: ${label} is required.`);
  }
  return normalized;
}

function optionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function assertHttpsUrl(value, label, index) {
  const normalized = assertNonEmptyString(value, label, index);
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`Entry #${index + 1}: ${label} must be a valid URL.`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`Entry #${index + 1}: ${label} must use HTTPS.`);
  }

  return parsed.toString();
}

async function assertResolvableHostname(urlValue, label, index) {
  const hostname = new URL(urlValue).hostname;

  try {
    await dns.lookup(hostname);
  } catch {
    throw new Error(`Entry #${index + 1}: ${label} hostname does not resolve publicly (${hostname}).`);
  }

  return urlValue;
}

function parseOutreachDate(value, index) {
  const normalized = assertNonEmptyString(value, 'outreachEmailSentAt', index);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T00:00:00.000Z`);
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Entry #${index + 1}: outreachEmailSentAt must be a valid date.`);
  }

  return parsed;
}

function buildSourceHash(companyName, title, sourceUrl) {
  return crypto
    .createHash('sha256')
    .update(`${companyName}|${title}|${sourceUrl}`)
    .digest('hex');
}

function buildLabel(job) {
  return `${job.companyName} - ${job.title}`;
}

function randomHex64() {
  return crypto.randomBytes(32).toString('hex');
}

function normalizeJobEntry(rawEntry, index) {
  const title = assertNonEmptyString(rawEntry?.title, 'title', index);
  const companyName = assertNonEmptyString(rawEntry?.companyName, 'companyName', index);
  const companyLogo = assertHttpsUrl(rawEntry?.companyLogo, 'companyLogo', index);
  const location = assertNonEmptyString(rawEntry?.location, 'location', index);
  const description = assertNonEmptyString(rawEntry?.description, 'description', index);
  const titleEn = optionalString(rawEntry?.titleEn);
  const descriptionEn = optionalString(rawEntry?.descriptionEn);
  const externalApplyUrl = assertHttpsUrl(rawEntry?.externalApplyUrl, 'externalApplyUrl', index);
  const sourceUrl = assertHttpsUrl(rawEntry?.sourceUrl, 'sourceUrl', index);
  const outreachEmailSentAt = parseOutreachDate(rawEntry?.outreachEmailSentAt, index);

  return {
    title,
    companyName,
    companyLogo,
    location,
    description,
    titleEn,
    descriptionEn,
    externalApplyUrl,
    sourceUrl,
    outreachEmailSentAt,
  };
}

async function resolveEnglishFields(job) {
  const [resolvedTitleEn, resolvedDescriptionEn] = await Promise.all([
    job.titleEn || translateText(job.title, 'en'),
    job.descriptionEn || translateText(job.description, 'en'),
  ]);

  return {
    titleEn: resolvedTitleEn,
    descriptionEn: resolvedDescriptionEn,
  };
}

async function readManualJobsFile() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Manual jobs file is missing: ${INPUT_FILE}`);
  }

  const raw = await fs.promises.readFile(INPUT_FILE, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Unable to parse ${INPUT_FILE}: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Manual jobs file must contain a JSON array: ${INPUT_FILE}`);
  }

  return Promise.all(parsed.map(async (entry, index) => {
    const job = normalizeJobEntry(entry, index);

    await Promise.all([
      assertResolvableHostname(job.externalApplyUrl, 'externalApplyUrl', index),
      assertResolvableHostname(job.sourceUrl, 'sourceUrl', index),
    ]);

    return job;
  }));
}

async function loadReferenceFactory() {
  const { customAlphabet } = await import('nanoid');
  return customAlphabet(REFERENCE_ALPHABET, 6);
}

async function generateUniqueReference(makeReferenceSuffix, reservedReferences) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = `BOLO-${makeReferenceSuffix().toUpperCase()}`;
    if (reservedReferences.has(candidate)) {
      continue;
    }

    const existing = await prisma.job.findUnique({
      where: { reference: candidate },
      select: { id: true },
    });

    if (!existing) {
      reservedReferences.add(candidate);
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique BOLO reference after 25 attempts.');
}

async function ensureBotUser(botEmail, dryRun) {
  const normalizedEmail = String(botEmail || DEFAULT_BOT_EMAIL).trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, role: true, isVerified: true },
  });

  if (existing) {
    return { user: existing, created: false };
  }

  if (dryRun) {
    console.log(`[DRY-RUN][BOT] would create admin sourcing bot ${normalizedEmail}`);
    return {
      user: { id: 0, email: normalizedEmail, role: 'ADMIN', isVerified: true },
      created: true,
    };
  }

  const passwordHash = await bcrypt.hash(randomHex64(), 12);
  const created = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: passwordHash,
      name: BOT_NAME,
      role: 'ADMIN',
      isVerified: true,
      isBanned: false,
    },
    select: { id: true, email: true, role: true, isVerified: true },
  });

  console.log(`[BOT] created admin sourcing bot ${created.email}`);
  return { user: created, created: true };
}

async function persistManualJob(job, botUser, dryRun, makeReferenceSuffix, reservedReferences) {
  const sourceHash = buildSourceHash(job.companyName, job.title, job.sourceUrl);
  const existing = await prisma.job.findUnique({
    where: { sourceHash },
    select: { id: true, reference: true },
  });
  const localizedFields = await resolveEnglishFields(job);

  const reference = existing?.reference || (await generateUniqueReference(makeReferenceSuffix, reservedReferences));
  const mode = existing ? 'UPDATE' : 'CREATE';

  if (dryRun) {
    console.log(`[${mode}] ${reference} - ${buildLabel(job)} (dry-run)`);
    return mode;
  }

  const baseData = {
    title: job.title,
    titleFr: job.title,
    titleEn: localizedFields.titleEn,
    title_fr: job.title,
    title_en: localizedFields.titleEn,
    company: job.companyName,
    location: job.location,
    description: job.description,
    descriptionFr: job.description,
    descriptionEn: localizedFields.descriptionEn,
    description_fr: job.description,
    description_en: localizedFields.descriptionEn,
    externalApplyUrl: job.externalApplyUrl,
    logoUrl: job.companyLogo,
    status: 'APPROVED',
    verified: true,
    sourceType: SOURCE_TYPE,
    sourceUrl: job.sourceUrl,
    sourceHash,
    outreachEmailSentAt: job.outreachEmailSentAt,
    authorId: botUser.id,
    deletedAt: null,
  };

  await prisma.job.upsert({
    where: { sourceHash },
    update: {
      ...baseData,
      ...(existing?.reference ? {} : { reference }),
    },
    create: {
      ...baseData,
      reference,
    },
  });

  console.log(`[${mode}] ${reference} - ${buildLabel(job)}`);
  return mode;
}

async function main() {
  const args = parseArgs(process.argv);
  const dryRun = args.has('--dry-run');
  const botEmail = process.env.SOURCING_BOT_EMAIL || DEFAULT_BOT_EMAIL;
  const jobs = await readManualJobsFile();
  const makeReferenceSuffix = await loadReferenceFactory();
  const reservedReferences = new Set();
  const seenSourceHashes = new Set();
  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  const { user: botUser } = await ensureBotUser(botEmail, dryRun);

  for (const job of jobs) {
    const sourceHash = buildSourceHash(job.companyName, job.title, job.sourceUrl);
    if (seenSourceHashes.has(sourceHash)) {
      summary.skipped += 1;
      console.log(`[SKIP] duplicate sourceHash in input - ${buildLabel(job)}`);
      continue;
    }

    seenSourceHashes.add(sourceHash);

    try {
      const mode = await persistManualJob(job, botUser, dryRun, makeReferenceSuffix, reservedReferences);
      if (mode === 'CREATE') {
        summary.created += 1;
      } else {
        summary.updated += 1;
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`[ERROR] ${buildLabel(job)} - ${error.message || error}`);
    }
  }

  if (dryRun) {
    console.log('Dry run: no database writes were performed.');
  }

  const summaryParts = [
    `${summary.created} created`,
    `${summary.updated} updated`,
  ];
  if (summary.skipped > 0) {
    summaryParts.push(`${summary.skipped} skipped`);
  }
  summaryParts.push(`${summary.errors} errors`);

  console.log(summaryParts.join(', '));
  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('[seed-manual-jobs] failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });