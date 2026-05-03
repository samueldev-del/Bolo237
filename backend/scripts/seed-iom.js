const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { prisma, pool } = require('../lib/db');
const { generateJobReference } = require('../lib/references');

const execFileAsync = promisify(execFile);

const IOM_EMAIL = 'iom@bolo237.com';
const IOM_NAME = 'OIM - ONU Migration';
const IOM_COMPANY = 'OIM - ONU Migration';
const IOM_LOGO_PUBLIC_PATH = '/companies/iom.png';
const EXTERNAL_APPLY_URL = 'https://fa-evlj-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/20217?utm_medium=jobboard&utm_source=linkedin';


async function generateUniqueReference() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateJobReference();
    const exists = await prisma.job.findUnique({
      where: { reference: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
  }

  throw new Error('Impossible de generer une reference unique BOLO-XXXXX apres 20 tentatives.');
}

async function ensureIomLogoFile() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const targetDir = path.join(repoRoot, 'frontend', 'public', 'companies');
  const targetFile = path.join(targetDir, 'iom.png');

  const candidateSources = [
    path.join(repoRoot, 'iom.png'),
    path.join(repoRoot, 'IOM.png'),
    path.join(repoRoot, 'iom.svg'),
    path.join(repoRoot, 'IOM.svg'),
    path.join(repoRoot, 'iom.jpg'),
    path.join(repoRoot, 'IOM.jpg'),
    path.join(repoRoot, 'iom.jpeg'),
    path.join(repoRoot, 'IOM.jpeg'),
    path.join(repoRoot, 'iom.webp'),
    path.join(repoRoot, 'IOM.webp'),
    path.join(repoRoot, 'frontend', 'public', 'iom.svg'),
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
    throw new Error('Logo introuvable. Placez "iom.png" a la racine du repo pour executer ce seed.');
  }

  await fs.mkdir(targetDir, { recursive: true });

  const sourceExtension = path.extname(sourceFile).toLowerCase();
  if (path.resolve(sourceFile) === path.resolve(targetFile)) {
    return IOM_LOGO_PUBLIC_PATH;
  }

  if (sourceExtension === '.png') {
    await fs.copyFile(sourceFile, targetFile);
    return IOM_LOGO_PUBLIC_PATH;
  }

  try {
    await execFileAsync('sips', ['-s', 'format', 'png', sourceFile, '--out', targetFile]);
  } catch (error) {
    throw new Error(`Conversion du logo impossible depuis ${path.basename(sourceFile)} vers iom.png: ${error.message}`);
  }

  return IOM_LOGO_PUBLIC_PATH;
}

async function ensureIomAuthor(logoPath) {
  const passwordHash = await bcrypt.hash('Bolo237-IOM-Seed-2026!', 10);

  return prisma.user.upsert({
    where: { email: IOM_EMAIL },
    update: {
      name: IOM_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    create: {
      email: IOM_EMAIL,
      password: passwordHash,
      name: IOM_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    select: { id: true, email: true, photoUrl: true },
  });
}

function buildDescriptionFr() {
  return [
    '## À propos de l\'OIM',
    'Créée en 1951, l\'OIM est l\'organisme des Nations Unies chargé des migrations. Elle travaille en étroite collaboration avec des partenaires gouvernementaux, intergouvernementaux et non gouvernementaux pour promouvoir une migration humaine et ordonnée.',
    '',
    '## Le Rôle',
    'Sous la supervision directe du Chef de Mission, le Chef de Sous-Bureau gérera les fonctions opérationnelles, administratives et programmatiques du sous-bureau de Douala. Il/Elle assurera la coordination efficace des activités sur le terrain et la supervision des opérations d\'évaluation de la santé (MHAC).',
    '',
    '## Responsabilités clés',
    '- Diriger, coordonner et superviser les opérations quotidiennes sur le terrain dans les régions ciblées.',
    '- Superviser entièrement la clinique MHAC à Douala, en respectant les normes de qualité médicale et les procédures de l\'OIM.',
    '- Maintenir une coordination étroite avec les autorités gouvernementales, les agences de l\'ONU, la société civile et le secteur privé.',
    '- Superviser la gestion des ressources humaines, les budgets, la logistique et les achats du sous-bureau.',
    '',
    '## Qualifications requises',
    '- Master en sciences sociales, relations internationales ou domaine connexe avec 5 ans d\'expérience (ou Licence avec 7 ans d\'expérience).',
    '- Expérience dans les opérations de terrain, la coordination et la supervision d\'équipes.',
    '- Excellente maîtrise de l\'anglais et du français (oral et écrit) requise.',
  ].join('\n');
}

function buildDescriptionEn() {
  return [
    '## About IOM',
    'Established in 1951, IOM is a Related Organization of the United Nations, and as the leading UN agency in the field of migration, works closely with governmental, intergovernmental and non-governmental partners.',
    '',
    '## The Role',
    'Under the direct supervision of the Chief of Mission, the Head of Sub-Office will manage the operational, administrative, and programmatic functions of the Sub-Office in Douala. They will ensure effective coordination of field activities and sound management of MHAC health assessment operations.',
    '',
    '## Key Responsibilities',
    '- Lead, coordinate, and supervise daily field operations across targeted regions.',
    '- Provide full operational oversight of the MHAC clinic in Douala, in compliance with IOM procedures and medical quality standards.',
    '- Maintain strong coordination with government authorities, UN agencies, civil society, and the private sector.',
    '- Supervise HR management, finance, logistics, and administrative units for the Sub-Office.',
    '',
    '## Required Qualifications',
    '- Master’s degree in Social Sciences, International Relations, or a related field with 5 years of relevant experience (or University degree with 7 years of experience).',
    '- Experience in field coordination, team supervision, and operational oversight.',
    '- Fluency in English and French (oral and written) is required.',
  ].join('\n');
}

async function upsertIomJob(authorId) {
  const titleFr = 'Chef de Sous-Bureau (P-3) - Douala';
  const titleEn = 'Head of Sub-Office (P-3) - Douala';
  const company = IOM_COMPANY;
  const location = 'Douala, Cameroun';

  const existingJobs = await prisma.job.findMany({
    where: {
      company,
      OR: [
        { title: { equals: titleFr, mode: 'insensitive' } },
        { title: { equals: titleEn, mode: 'insensitive' } },
        { titleFr: { equals: titleFr, mode: 'insensitive' } },
        { titleEn: { equals: titleEn, mode: 'insensitive' } },
      ],
    },
    orderBy: { id: 'asc' },
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

  const descriptionFr = buildDescriptionFr();
  const descriptionEn = buildDescriptionEn();
  const reference = existing?.reference || await generateUniqueReference();

  const data = {
    reference,
    title: titleFr,
    titleFr,
    titleEn,
    description: descriptionFr,
    descriptionFr,
    descriptionEn,
    company,
    location,
    salary: 'Grade P-3',
    status: 'APPROVED',
    externalApplyUrl: EXTERNAL_APPLY_URL,
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
  console.log('Seed IOM: demarrage...');

  const logoPath = await ensureIomLogoFile();
  const author = await ensureIomAuthor(logoPath);
  const job = await upsertIomJob(author.id);

  console.log(`Auteur IOM utilise: ${author.id} (${author.email})`);
  console.log(`Logo associe: ${author.photoUrl}`);
  console.log(`Offre synchronisee: ${job.title} [${job.reference}]`);
  console.log(`Lien externe: ${job.externalApplyUrl}`);
  console.log(`Statut: ${job.status}`);
}

main()
  .catch((error) => {
    console.error('Seed IOM: echec', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });