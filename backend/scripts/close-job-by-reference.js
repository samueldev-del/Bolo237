#!/usr/bin/env node

require('dotenv').config();

const { prisma, pool } = require('../lib/db');

const PUBLIC_JOB_STATUSES = new Set(['APPROVED', 'ACTIVE']);
const HIDDEN_JOB_STATUSES = new Set(['PENDING', 'REJECTED', 'CLOSED', 'ARCHIVED']);

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    apply: false,
    help: false,
    reference: '',
    status: 'CLOSED',
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--apply') {
      options.apply = true;
      continue;
    }

    if (current === '--help' || current === '-h') {
      options.help = true;
      continue;
    }

    if (current.startsWith('--reference=')) {
      options.reference = current.slice('--reference='.length).trim();
      continue;
    }

    if (current === '--reference') {
      options.reference = String(args[index + 1] || '').trim();
      index += 1;
      continue;
    }

    if (current.startsWith('--status=')) {
      options.status = current.slice('--status='.length).trim().toUpperCase();
      continue;
    }

    if (current === '--status') {
      options.status = String(args[index + 1] || '').trim().toUpperCase();
      index += 1;
    }
  }

  return options;
}

function printUsage() {
  console.log('Usage: node scripts/close-job-by-reference.js --reference BOLO-XXXXXX [--status CLOSED] [--apply]');
  console.log('');
  console.log('Default mode is dry-run. Add --apply to execute the update.');
  console.log('Allowed hiding statuses: PENDING, REJECTED, CLOSED, ARCHIVED.');
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printUsage();
    return;
  }

  const reference = String(options.reference || process.env.JOB_REFERENCE || '').trim().toUpperCase();
  const nextStatus = String(options.status || process.env.JOB_TARGET_STATUS || 'CLOSED').trim().toUpperCase();

  if (!reference) {
    throw new Error('A job reference is required. Example: --reference BOLO-QTT24E');
  }

  if (!HIDDEN_JOB_STATUSES.has(nextStatus)) {
    throw new Error(`Unsupported target status: ${nextStatus}. Use one of: ${Array.from(HIDDEN_JOB_STATUSES).join(', ')}`);
  }

  const job = await prisma.job.findUnique({
    where: { reference },
    select: {
      id: true,
      reference: true,
      title: true,
      company: true,
      status: true,
      externalApplyUrl: true,
      sourceUrl: true,
      createdAt: true,
    },
  });

  if (!job) {
    throw new Error(`Job not found for reference: ${reference}`);
  }

  console.log(`Found job ${job.reference} - ${job.company} - ${job.title}`);
  console.log(`Current status: ${job.status}`);
  console.log(`Target status: ${nextStatus}`);
  if (job.externalApplyUrl) {
    console.log(`External apply URL: ${job.externalApplyUrl}`);
  }
  if (job.sourceUrl) {
    console.log(`Source URL: ${job.sourceUrl}`);
  }

  if (job.status === nextStatus) {
    console.log('No update needed: job already has the requested status.');
    return;
  }

  const removesFromPublicFeed = PUBLIC_JOB_STATUSES.has(String(job.status || '').toUpperCase())
    && !PUBLIC_JOB_STATUSES.has(nextStatus);

  if (!options.apply) {
    console.log(`[dry-run] Would update ${reference} from ${job.status} to ${nextStatus}.`);
    if (removesFromPublicFeed) {
      console.log('[dry-run] This change would remove the job from public listing and detail routes.');
    }
    return;
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: { status: nextStatus },
    select: {
      id: true,
      reference: true,
      status: true,
    },
  });

  console.log(`Updated job ${updated.reference} to status ${updated.status}.`);
  if (removesFromPublicFeed) {
    console.log('The job is now hidden from public listing and detail routes.');
  }
}

main()
  .catch((error) => {
    console.error('[close-job-by-reference] failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
