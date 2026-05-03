const fs = require('node:fs/promises');
const path = require('node:path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { prisma, pool } = require('../lib/db');
const { generateJobReference } = require('../lib/references');

const SYSTEM_EMAIL = 'system@bolo237.com';
const LAPAIRE_EMAIL = 'lapaire@bolo237.com';
const LAPAIRE_NAME = 'Lapaire';
const LAPAIRE_LOGO_PUBLIC_PATH = '/companies/lapaire.png';
const EXTERNAL_APPLY_URL = 'https://lapaireglasses.applytojob.com/apply/07VCgsO7M1/Responsable-De-Zone-Douala-Cameroun?source=LILI';


async function generateUniqueReference() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateJobReference();
    const exists = await prisma.job.findUnique({ where: { reference: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error('Impossible de generer une reference unique BOLO-XXXXX apres 20 tentatives.');
}

async function ensureLapaireLogoFile() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const targetDir = path.join(repoRoot, 'frontend', 'public', 'companies');
  const targetFile = path.join(targetDir, 'lapaire.png');

  const candidateSources = [
    path.join(repoRoot, 'Lapaire.png'),
    path.join(repoRoot, 'lapaire.png'),
    path.join(repoRoot, 'frontend', 'public', 'Lapaire.png'),
    path.join(repoRoot, 'frontend', 'public', 'lapaire.png'),
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
    throw new Error('Logo introuvable. Placez "Lapaire.png" a la racine du repo ou dans frontend/public/.');
  }

  await fs.mkdir(targetDir, { recursive: true });
  if (path.resolve(sourceFile) !== path.resolve(targetFile)) {
    await fs.copyFile(sourceFile, targetFile);
  }

  return LAPAIRE_LOGO_PUBLIC_PATH;
}

async function ensureAuthorWithDedicatedLogo(logoPath) {
  const relayUser = await prisma.user.findUnique({
    where: { email: SYSTEM_EMAIL },
    select: { id: true, email: true },
  });

  if (!relayUser) {
    throw new Error('Utilisateur system@bolo237.com introuvable. Lancez d abord le seed systeme.');
  }

  const passwordHash = await bcrypt.hash('Bolo237-Lapaire-Seed-2026!', 10);

  const author = await prisma.user.upsert({
    where: { email: LAPAIRE_EMAIL },
    update: {
      name: LAPAIRE_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    create: {
      email: LAPAIRE_EMAIL,
      password: passwordHash,
      name: LAPAIRE_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    select: { id: true, email: true, photoUrl: true },
  });

  return { relayUser, author };
}

function buildJobDescription() {
  return [
    '## Introduction',
    '*Cette offre est relayée par Bolo237. Pour postuler officiellement, veuillez utiliser le lien externe.*',
    '',
    '## À propos de l’entreprise',
    "Lapaire est une entreprise panafricaine dynamique d’optique, présente dans plus de 100 agences réparties dans 9 pays, dont la mission est de rendre la santé visuelle accessible à tous à des prix justes et transparents.",
    '',
    '## Le role',
    'Sous la supervision du Country Manager, vous serez responsable de la gestion et de la performance commerciale de 6 à 8 agences à Douala.',
    '',
    '## Missions principales',
    '- Manager et former les responsables d’agence en continu.',
    '- Établir des plannings de visites et assurer le suivi terrain.',
    '- Développer des plans d’actions commerciales pour atteindre les objectifs de chiffre d’affaires.',
    '- Gérer les stocks, la comptabilité et la bonne tenue des boutiques.',
    '',
    '## Profil recherché',
    '- Diplôme universitaire (Bac +3/4 en comptabilité, finance ou management).',
    '- 3 à 4 ans d’expérience professionnelle.',
    '- Expérience exigée en management de magasin et d’équipe.',
    '- Excellente maîtrise d’Excel.',
    '- Esprit leader, organisé, intègre et orienté solutions.',
  ].join('\n');
}

function buildJobDescriptionEn() {
  return [
    '## Introduction',
    '*This listing is relayed by Bolo237. To apply officially, please use the external link.*',
    '',
    '## About the company',
    'Lapaire is a fast-growing pan-African optical company with more than 100 branches across 9 countries. Its mission is to make eye care accessible to everyone through fair and transparent pricing.',
    '',
    '## The role',
    'Reporting to the Country Manager, you will be responsible for the management and commercial performance of 6 to 8 branches in Douala.',
    '',
    '## Key responsibilities',
    '- Continuously coach and manage Branch Managers.',
    '- Build visit schedules and ensure consistent field follow-up.',
    '- Develop commercial action plans to achieve revenue targets.',
    '- Oversee stock, accounting discipline, and overall store operations.',
    '',
    '## Candidate profile',
    '- University degree (Bachelor level) in accounting, finance, or management.',
    '- 3 to 4 years of professional experience.',
    '- Required experience in store and team management.',
    '- Excellent command of Excel.',
    '- Strong leadership mindset, organization, integrity, and solution orientation.',
  ].join('\n');
}

async function upsertLapaireJob(authorId) {
  const titleFr = 'Responsable de zone (H/F)';
  const titleEn = 'Area Manager (M/F)';
  const company = 'Lapaire';
  const location = 'Douala, Région du Littoral';

  const existingJobs = await prisma.job.findMany({
    where: {
      authorId,
      company,
      OR: [
        { title: { equals: titleFr, mode: 'insensitive' } },
        { title: { equals: titleEn, mode: 'insensitive' } },
        { titleFr: { equals: titleFr, mode: 'insensitive' } },
        { titleEn: { equals: titleEn, mode: 'insensitive' } },
      ],
    },
    select: { id: true, reference: true },
  });

  const existing = existingJobs[0] ?? null;

  if (existingJobs.length > 1) {
    await prisma.job.deleteMany({
      where: {
        id: { in: existingJobs.slice(1).map((job) => job.id) },
      },
    });
  }

  const reference = existing?.reference || await generateUniqueReference();

  const data = {
    reference,
    title: titleFr,
    titleFr,
    titleEn,
    company,
    location,
    salary: 'Temps plein',
    status: 'APPROVED',
    externalApplyUrl: EXTERNAL_APPLY_URL,
    description: buildJobDescription(),
    descriptionFr: buildJobDescription(),
    descriptionEn: buildJobDescriptionEn(),
  };

  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data,
      select: { id: true, title: true, reference: true, status: true, externalApplyUrl: true },
    });
  }

  return prisma.job.create({
    data: {
      ...data,
      authorId,
    },
    select: { id: true, title: true, reference: true, status: true, externalApplyUrl: true },
  });
}

async function main() {
  console.log('Seed Lapaire: demarrage...');

  const logoPath = await ensureLapaireLogoFile();
  const { relayUser, author } = await ensureAuthorWithDedicatedLogo(logoPath);
  const job = await upsertLapaireJob(author.id);

  console.log(`Relay user detecte (${SYSTEM_EMAIL}): ${relayUser.id}`);
  console.log(`Auteur Lapaire utilise: ${author.id} (${author.email})`);
  console.log(`Logo associe: ${author.photoUrl}`);
  console.log(`Offre synchronisee: ${job.title} [${job.reference}]`);
  console.log(`Lien externe: ${job.externalApplyUrl}`);
  console.log(`Statut: ${job.status}`);
}

main()
  .catch((error) => {
    console.error('Seed Lapaire: echec', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });