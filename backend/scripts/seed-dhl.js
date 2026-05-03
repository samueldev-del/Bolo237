const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { prisma, pool } = require('../lib/db');
const { generateJobReference } = require('../lib/references');

const execFileAsync = promisify(execFile);

const DHL_EMAIL = 'dhl@bolo237.com';
const DHL_NAME = 'DHL Cameroon';
const DHL_COMPANY = 'DHL Cameroon';
const DHL_LOGO_PUBLIC_PATH = '/companies/dhl.png';

const DHL_JOBS = [
  {
    titleEn: 'Company Secretary & Legal Counsel',
    titleFr: 'Secrétaire Général & Conseiller Juridique',
    company: DHL_COMPANY,
    location: 'Douala, Littoral',
    salary: 'Temps plein',
    externalApplyUrl: 'https://careers.dhl.com/global/en/job/DPDHGLOBALAV341264ENGLOBALEXTERNAL/Company-Secretary-Legal-Counsel',
    status: 'APPROVED',
    descriptionEn: '## Job Purpose\nWe are looking for an experienced legal professional to take on a dual role combining Company Secretary responsibilities across the Sub-Saharan Africa region with Legal Counsel support for Cameroon.\n\n## Key Responsibilities\n**Company Secretary – Sub-Saharan Africa**\n- Lead and manage company secretarial activities across multiple jurisdictions.\n- Ensure compliance with local corporate governance, statutory, and regulatory requirements.\n- Coordinate board and committee meetings.\n\n**Legal Counsel – Cameroon**\n- Provide legal advice and support to the business in Cameroon (commercial, employment, regulatory).\n- Draft, review, and negotiate contracts.\n- Support dispute resolution and manage external counsel.\n\n## Key Requirements\n- Minimum 8+ years of experience in corporate governance or secretarial roles.\n- Qualified lawyer in Cameroon.\n- Fluent in English and French.',
    descriptionFr: '## Objectif du poste\nNous recherchons un professionnel du droit expérimenté pour assumer un double rôle combinant les responsabilités de Secrétaire Général pour la région de l\'Afrique subsaharienne et le soutien en tant que Conseiller Juridique pour le Cameroun.\n\n## Responsabilités clés\n**Secrétariat Général – Afrique subsaharienne**\n- Diriger et gérer les activités de secrétariat d\'entreprise sur plusieurs juridictions.\n- Assurer la conformité avec la gouvernance d\'entreprise locale et les exigences réglementaires.\n- Coordonner les réunions du conseil d\'administration.\n\n**Conseiller Juridique – Cameroun**\n- Fournir des conseils juridiques et un soutien aux activités au Cameroun (commercial, emploi, réglementation).\n- Rédiger, réviser et négocier des contrats.\n- Soutenir la résolution des litiges.\n\n## Profil requis\n- Minimum 8 ans d\'expérience dans des rôles de gouvernance d\'entreprise ou de secrétariat.\n- Avocat qualifié au Cameroun.\n- Parfaitement bilingue Anglais/Français.',
  },
  {
    titleEn: 'CDZ Specialist (Customs & Trade Compliance)',
    titleFr: 'Spécialiste CDZ (Douanes et Conformité)',
    company: DHL_COMPANY,
    location: 'Douala, Littoral',
    salary: 'Temps plein',
    externalApplyUrl: 'https://careers.dhl.com/global/en/job/DPDHGLOBALAV347637ENGLOBALEXTERNAL/CDZ-Specialist',
    status: 'APPROVED',
    descriptionEn: '## The Role\nDHL Global Forwarding has an opening for a CDZ Specialist in Cameroon. You will provide day-to-day administrative support and advice on customs and trade compliance activities to ensure clearance of freight documentation through the relevant customs authorities.\n\n## Key Responsibilities\n- Support the delivery of customs and trade compliance processes.\n- Perform import/export documentation tasks, update shipment information, and maintain master data.\n- Execute the filing of customs entries and post-entry transactions.\n- Research, identify, and obtain permits, licenses, and certificates required for customs clearance.\n- Advise customers on legal and customs topics.\n\n## Requirements\n- Education: Vocational/Specialized/Technical Certification.\n- Experience: Less than 2 years.\n- Skills: Customs Regulations, Import/Export, Data Entry, Microsoft Excel, Accuracy, and Stakeholder Management.',
    descriptionFr: '## Le Rôle\nDHL Global Forwarding est à la recherche d\'un Spécialiste CDZ au Cameroun. Vous fournirez un soutien administratif quotidien et des conseils sur les activités douanières et de conformité commerciale afin d\'assurer le dédouanement du fret auprès des autorités compétentes.\n\n## Responsabilités clés\n- Soutenir l\'exécution des processus de dédouanement et de conformité commerciale.\n- Gérer la documentation d\'import/export, mettre à jour les statuts d\'expédition et consolider les données.\n- Exécuter les déclarations en douane et les transactions post-dédouanement.\n- Rechercher et obtenir les permis, licences et certificats requis pour le dédouanement.\n- Conseiller les clients sur les questions juridiques et douanières.\n\n## Profil requis\n- Éducation : Certification professionnelle / technique spécialisée.\n- Expérience : Moins de 2 ans (Débutants acceptés).\n- Compétences : Réglementations douanières, Import/Export, Saisie de données, Microsoft Excel, Rigueur.',
  },
];


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

async function ensureDhlLogoFile() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const targetDir = path.join(repoRoot, 'frontend', 'public', 'companies');
  const targetFile = path.join(targetDir, 'dhl.png');

  const candidateSources = [
    path.join(repoRoot, 'dhl.png'),
    path.join(repoRoot, 'DHL.png'),
    path.join(repoRoot, 'dhl.svg'),
    path.join(repoRoot, 'DHL.svg'),
    path.join(repoRoot, 'dhl.jpg'),
    path.join(repoRoot, 'DHL.jpg'),
    path.join(repoRoot, 'dhl.jpeg'),
    path.join(repoRoot, 'DHL.jpeg'),
    path.join(repoRoot, 'dhl.webp'),
    path.join(repoRoot, 'DHL.webp'),
    path.join(repoRoot, 'frontend', 'public', 'dhl.png'),
    path.join(repoRoot, 'frontend', 'public', 'dhl.svg'),
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
    throw new Error('Logo DHL introuvable. Placez "dhl.png" a la racine du repo pour executer ce seed.');
  }

  await fs.mkdir(targetDir, { recursive: true });

  const sourceExtension = path.extname(sourceFile).toLowerCase();
  if (path.resolve(sourceFile) === path.resolve(targetFile)) {
    return DHL_LOGO_PUBLIC_PATH;
  }

  if (sourceExtension === '.png') {
    await fs.copyFile(sourceFile, targetFile);
    return DHL_LOGO_PUBLIC_PATH;
  }

  try {
    await execFileAsync('sips', ['-s', 'format', 'png', sourceFile, '--out', targetFile]);
  } catch (error) {
    throw new Error(`Conversion du logo DHL impossible depuis ${path.basename(sourceFile)} vers dhl.png: ${error.message}`);
  }

  return DHL_LOGO_PUBLIC_PATH;
}

async function ensureDhlAuthor(logoPath) {
  const passwordHash = await bcrypt.hash('Bolo237-DHL-Seed-2026!', 10);

  return prisma.user.upsert({
    where: { email: DHL_EMAIL },
    update: {
      name: DHL_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    create: {
      email: DHL_EMAIL,
      password: passwordHash,
      name: DHL_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    select: { id: true, email: true, photoUrl: true },
  });
}

async function upsertDhlJob(authorId, jobData) {
  const existingJobs = await prisma.job.findMany({
    where: {
      company: jobData.company,
      titleFr: { equals: jobData.titleFr, mode: 'insensitive' },
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

  const reference = existing?.reference || await generateUniqueReference();
  const payload = {
    reference,
    title: jobData.titleFr,
    titleFr: jobData.titleFr,
    titleEn: jobData.titleEn,
    description: jobData.descriptionFr,
    descriptionFr: jobData.descriptionFr,
    descriptionEn: jobData.descriptionEn,
    company: jobData.company,
    location: jobData.location,
    salary: jobData.salary,
    externalApplyUrl: jobData.externalApplyUrl,
    status: jobData.status,
  };

  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data: payload,
      select: { id: true, title: true, reference: true, externalApplyUrl: true, status: true },
    });
  }

  return prisma.job.create({
    data: {
      ...payload,
      authorId,
    },
    select: { id: true, title: true, reference: true, externalApplyUrl: true, status: true },
  });
}

async function main() {
  console.log('Seed DHL: demarrage...');

  const logoPath = await ensureDhlLogoFile();
  const author = await ensureDhlAuthor(logoPath);

  const jobs = [];
  for (const jobData of DHL_JOBS) {
    jobs.push(await upsertDhlJob(author.id, jobData));
  }

  console.log(`Auteur DHL utilise: ${author.id} (${author.email})`);
  console.log(`Logo associe: ${author.photoUrl}`);
  console.log(`Offres synchronisees: ${jobs.length}`);
  for (const job of jobs) {
    console.log(`- ${job.title} [${job.reference}]`);
    console.log(`  Lien externe: ${job.externalApplyUrl}`);
    console.log(`  Statut: ${job.status}`);
  }
}

main()
  .catch((error) => {
    console.error('Seed DHL: echec', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });