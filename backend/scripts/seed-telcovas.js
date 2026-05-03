const fs = require('node:fs/promises');
const path = require('node:path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { prisma, pool } = require('../lib/db');
const { generateJobReference } = require('../lib/references');

const TELCOVAS_EMAIL = 'telcovas@bolo237.com';
const TELCOVAS_NAME = 'Telcovas';
const TELCOVAS_LOGO_PUBLIC_PATH = '/companies/telcovas.jpeg';
const EXTERNAL_APPLY_URL = 'https://telcovas.snaphunt.com/job/G4C2TP79RM?source=linkedin';


async function generateUniqueReference() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateJobReference();
    const exists = await prisma.job.findUnique({ where: { reference: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error('Impossible de generer une reference unique BOLO-XXXXX apres 20 tentatives.');
}

async function ensureTelcovasLogoFile() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const targetDir = path.join(repoRoot, 'frontend', 'public', 'companies');
  const targetFile = path.join(targetDir, 'telcovas.jpeg');

  const candidateSources = [
    path.join(repoRoot, 'telcovas.png'),
    path.join(repoRoot, 'telcovas.jpg'),
    path.join(repoRoot, 'telcovas.jpeg'),
    path.join(repoRoot, 'Telcovas.png'),
    path.join(repoRoot, 'Telcovas.jpg'),
    path.join(repoRoot, 'Telcovas.jpeg'),
    path.join(repoRoot, 'frontend', 'public', 'telcovas.png'),
    path.join(repoRoot, 'frontend', 'public', 'telcovas.jpg'),
    path.join(repoRoot, 'frontend', 'public', 'telcovas.jpeg'),
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
    throw new Error('Logo introuvable. Placez "telcovas.png", "telcovas.jpg" ou "telcovas.jpeg" a la racine du repo ou dans frontend/public/.');
  }

  await fs.mkdir(targetDir, { recursive: true });
  if (path.resolve(sourceFile) !== path.resolve(targetFile)) {
    await fs.copyFile(sourceFile, targetFile);
  }

  return TELCOVAS_LOGO_PUBLIC_PATH;
}

async function ensureTelcovasAuthor(logoPath) {
  const passwordHash = await bcrypt.hash('Bolo237-Telcovas-Seed-2026!', 10);

  const author = await prisma.user.upsert({
    where: { email: TELCOVAS_EMAIL },
    update: {
      name: TELCOVAS_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    create: {
      email: TELCOVAS_EMAIL,
      password: passwordHash,
      name: TELCOVAS_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    select: { id: true, email: true, photoUrl: true },
  });

  return author;
}

function buildJobDescription() {
  return [
    '## Introduction',
    '*Cette offre est relayée par Bolo237. Pour postuler officiellement, veuillez utiliser le lien externe.*',
    '',
    '## À propos du rôle',
    'Nous recherchons un professionnel motivé à la double casquette ingénieur/commercial pour soutenir et développer notre activité de services à valeur ajoutée (VAS) télécoms sur les marchés africains. Ce poste combine coordination technique, développement commercial et gestion des relations avec les opérateurs.',
    '',
    '## Type de contrat',
    '- Temps plein',
    '',
    '## Rémunération indicative',
    '- 3 000 - 4 200 USD / an',
    '',
    '## Responsabilités clés',
    '- Soutenir le déploiement des solutions Telecom VAS.',
    '- Stimuler les ventes et le développement commercial.',
    '- Comprendre les exigences techniques et proposer des solutions adaptées.',
    '- Coordonner avec les équipes internes pour l’exécution des priorités.',
    '',
    '## Qualifications et compétences',
    '- Diplôme en télécoms, électronique, informatique ou domaine lié.',
    '- Candidats débutants (entry-level) acceptés.',
    '- Fortes compétences en communication.',
    '- Intérêt marqué pour la vente et la croissance d’entreprise.',
    '',
    '## Compétences appréciées',
    '- Expérience dans la vente télécom ou la relation client.',
    '- Capacités de présentation et de négociation.',
  ].join('\n');
}

function buildJobDescriptionEn() {
  return [
    '## Introduction',
    '*This listing is relayed by Bolo237. To apply officially, please use the external link.*',
    '',
    '## About the role',
    'We are looking for a motivated engineer-commercial profile to support and expand our telecom value-added services (VAS) business across African markets. This role combines technical coordination, business development, and operator relationship management.',
    '',
    '## Contract type',
    '- Full time',
    '',
    '## Indicative compensation',
    '- USD 3,000 - 4,200 per year',
    '',
    '## Key responsibilities',
    '- Support the rollout of Telecom VAS solutions.',
    '- Drive sales and business development efforts.',
    '- Understand technical requirements and propose suitable solutions.',
    '- Coordinate with internal teams to execute on priorities.',
    '',
    '## Qualifications and skills',
    '- Degree in Telecommunications, Electronics, Computer Science, or a related field.',
    '- Entry-level candidates are welcome.',
    '- Strong communication skills.',
    '- Strong interest in sales and business growth.',
    '',
    '## Nice to have',
    '- Experience in telecom sales or customer relationship management.',
    '- Presentation and negotiation skills.',
  ].join('\n');
}

async function upsertTelcovasJob(authorId) {
  const titleFr = 'Ingénieur commercial en développement des affaires';
  const titleEn = 'Engineer Business Development Manager';
  const company = 'Telcovas';
  const location = 'Douala, Littoral';

  const existing = await prisma.job.findFirst({
    where: {
      authorId,
      company,
      OR: [
        { title: titleFr },
        { title: titleEn },
        { titleFr },
        { titleEn },
      ],
    },
    select: { id: true, reference: true },
  });

  const reference = existing?.reference || await generateUniqueReference();

  const data = {
    reference,
    title: titleFr,
    titleFr,
    titleEn,
    company,
    location,
    salary: '3 000 - 4 200 USD / an',
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
  console.log('Seed Telcovas: demarrage...');

  const logoPath = await ensureTelcovasLogoFile();
  const author = await ensureTelcovasAuthor(logoPath);
  const job = await upsertTelcovasJob(author.id);

  console.log(`Auteur Telcovas utilise: ${author.id} (${author.email})`);
  console.log(`Logo associe: ${author.photoUrl}`);
  console.log(`Offre synchronisee: ${job.title} [${job.reference}]`);
  console.log(`Lien externe: ${job.externalApplyUrl}`);
  console.log(`Statut: ${job.status}`);
}

main()
  .catch((error) => {
    console.error('Seed Telcovas: echec', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });