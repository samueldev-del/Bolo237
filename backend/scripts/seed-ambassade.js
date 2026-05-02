const fs = require('node:fs/promises');
const path = require('node:path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { prisma, pool } = require('../lib/db');

const AMBASSADE_EMAIL = 'ambassade@bolo237.com';
const AMBASSADE_NAME = 'Ambassade de France';
const AMBASSADE_LOGO_PUBLIC_PATH = '/companies/ambassade-france.png';
const EXTERNAL_APPLY_URL = 'https://emplois.diplomatie.gouv.fr/nos-offres/320cce4a-3f01-401b-b75d-70b463f6e519';

function generateJobReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'BOLO-';
  for (let i = 0; i < 5; i += 1) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

async function generateUniqueReference() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateJobReference();
    const exists = await prisma.job.findUnique({ where: { reference: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error('Impossible de generer une reference unique BOLO-XXXXX apres 20 tentatives.');
}

async function ensureAmbassadeLogoFile() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const targetDir = path.join(repoRoot, 'frontend', 'public', 'companies');
  const targetFile = path.join(targetDir, 'ambassade-france.png');

  const candidateSources = [
    path.join(repoRoot, 'ambassade-france.png'),
    path.join(repoRoot, 'frontend', 'public', 'ambassade-france.png'),
    path.join(repoRoot, 'frontend', 'public', "Ministere_de_l'Europe_et_des_Affaires_Etrangeres.svg.png"),
    path.join(repoRoot, 'frontend', 'public', "Ministère_de_l'Europe_et_des_Affaires_Étrangères.svg.png"),
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
    throw new Error('Logo introuvable. Placez "ambassade-france.png" a la racine du repo ou dans frontend/public/.');
  }

  await fs.mkdir(targetDir, { recursive: true });
  if (path.resolve(sourceFile) !== path.resolve(targetFile)) {
    await fs.copyFile(sourceFile, targetFile);
  }

  return AMBASSADE_LOGO_PUBLIC_PATH;
}

async function ensureAmbassadeAuthor(logoPath) {
  const relayUser = await prisma.user.findUnique({
    where: { email: 'system@bolo237.com' },
    select: { id: true, email: true },
  });

  if (!relayUser) {
    throw new Error('Utilisateur system@bolo237.com introuvable. Lancez d abord le seed systeme.');
  }

  const passwordHash = await bcrypt.hash('Bolo237-Ambassade-Seed-2026!', 10);

  const author = await prisma.user.upsert({
    where: { email: AMBASSADE_EMAIL },
    update: {
      name: AMBASSADE_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    create: {
      email: AMBASSADE_EMAIL,
      password: passwordHash,
      name: AMBASSADE_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    select: { id: true, email: true, photoUrl: true },
  });

  return { author, relayUserId: relayUser.id };
}

function buildJobDescription() {
  return [
    '## Introduction',
    'Cette offre est relayée par Bolo237. Pour postuler officiellement, veuillez utiliser le lien externe.',
    '',
    '## Description synthétique',
    "Effectuer, sous l’autorité du consul général et du chef de service des visas, la vérification, le traitement et l’instruction des dossiers de demandes de visa.",
    '',
    '## Activités principales',
    '- Vérification et contrôle de conformité des dossiers de demande de visa.',
    '- Mise en place et suivi d’instruments de pilotage de l’activité.',
    '- Réalisation du programme de vérification et des contrôles documentaires.',
    '- Contrôle, tenue et gestion de la caisse dans le respect des procédures.',
    '- Rédaction de notes, synthèses et comptes rendus opérationnels.',
    '- Appui aux contrôles internes et à l’amélioration continue de la section consulaire.',
    '',
    '## Profil recommandé',
    'La connaissance ou la maîtrise d’une langue locale constituerait un atout, ainsi que la connaissance de la région.',
    '',
    '## Prise de fonction',
    'Prise de fonction prévue pour le 01/09/2026.',
  ].join('\n');
}

function buildJobDescriptionEn() {
  return [
    '## Introduction',
    'This listing is relayed by Bolo237. To apply officially, please use the external link.',
    '',
    '## Position summary',
    'Under the authority of the Consul General and the Head of the Visa Department, the role is responsible for reviewing, processing, and handling visa application files.',
    '',
    '## Main responsibilities',
    '- Verify and check the compliance of visa application files.',
    '- Set up and monitor activity management tools and reporting indicators.',
    '- Execute the verification program and document control procedures.',
    '- Oversee cash handling and related administrative procedures in full compliance with internal rules.',
    '- Draft notes, summaries, and operational reports.',
    '- Support internal controls and continuous improvement across the consular section.',
    '',
    '## Recommended profile',
    'Knowledge or command of a local language would be an asset, as would familiarity with the region.',
    '',
    '## Start date',
    'Planned start date: 01/09/2026.',
  ].join('\n');
}

async function upsertAmbassadeJob(authorId) {
  const titleFr = 'Agent visas (F/H) - Section consulaire';
  const titleEn = 'Visa Officer (F/M) - Consular Section';
  const company = 'Ambassade de France au Cameroun';
  const location = 'Yaoundé, Région du Centre';

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
      select: { id: true, title: true, reference: true, externalApplyUrl: true, status: true },
    });
  }

  return prisma.job.create({
    data: {
      ...data,
      authorId,
    },
    select: { id: true, title: true, reference: true, externalApplyUrl: true, status: true },
  });
}

async function main() {
  console.log('Seed Ambassade: demarrage...');

  const logoPath = await ensureAmbassadeLogoFile();
  const { author, relayUserId } = await ensureAmbassadeAuthor(logoPath);
  const job = await upsertAmbassadeJob(author.id);

  console.log(`Relay user detecte (system@bolo237.com): ${relayUserId}`);
  console.log(`Auteur Ambassade utilise: ${author.id} (${author.email})`);
  console.log(`Logo associe: ${author.photoUrl}`);
  console.log(`Offre synchronisee: ${job.title} [${job.reference}]`);
  console.log(`Lien externe: ${job.externalApplyUrl}`);
  console.log(`Statut: ${job.status}`);
}

main()
  .catch((error) => {
    console.error('Seed Ambassade: echec', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });