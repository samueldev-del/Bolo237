const bcrypt = require('bcryptjs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { prisma, pool } = require('../lib/db');

const GOZEM_EMAIL = 'gozem@bolo237.com';
const GOZEM_NAME = 'Gozem';
const EXTERNAL_APPLY_URL = 'https://gozem.breezy.hr/p/0ba1957ab7ca-business-developer';

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

async function ensureGozemAuthor() {
  const passwordHash = await bcrypt.hash('Bolo237-Gozem-Seed-2026!', 10);

  return prisma.user.upsert({
    where: { email: GOZEM_EMAIL },
    update: {
      name: GOZEM_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
    },
    create: {
      email: GOZEM_EMAIL,
      password: passwordHash,
      name: GOZEM_NAME,
      role: 'ENTREPRISE',
      isVerified: true,
    },
    select: { id: true, email: true },
  });
}

function buildDescription() {
  return [
    '## Introduction',
    '*Cette offre est relayée par Bolo237. Pour postuler officiellement, veuillez utiliser le lien externe.*',
    '',
    '## À propos du rôle',
    'Gozem recrute un responsable du développement commercial pour accélérer la croissance commerciale, renforcer les partenariats et contribuer au développement des activités dans la région.',
    '',
    '## Missions principales',
    '- Identifier et développer de nouvelles opportunités commerciales.',
    '- Structurer le pipeline de prospection et suivre la conversion.',
    '- Coordonner avec les équipes internes pour assurer une exécution qualitative.',
    '- Piloter les relations partenaires et le suivi des performances.',
    '',
    '## Profil recherché',
    '- Excellentes compétences de communication et de négociation.',
    '- Orientation résultat et sens de l’analyse business.',
    '- Capacité à évoluer dans un environnement dynamique et multi-activités.',
  ].join('\n');
}

function buildDescriptionEn() {
  return [
    '## Introduction',
    '*This listing is relayed by Bolo237. To apply officially, please use the external link.*',
    '',
    '## About the role',
    'Gozem is hiring a Business Developer to accelerate commercial growth, strengthen partnerships, and support regional expansion initiatives.',
    '',
    '## Key responsibilities',
    '- Identify and develop new business opportunities.',
    '- Structure the prospecting pipeline and track conversion performance.',
    '- Coordinate with internal teams to ensure high-quality execution.',
    '- Manage partner relationships and monitor performance indicators.',
    '',
    '## Candidate profile',
    '- Excellent communication and negotiation skills.',
    '- Strong results-oriented mindset with solid business analysis capabilities.',
    '- Ability to thrive in a fast-paced, multi-activity environment.',
  ].join('\n');
}

async function upsertGozemJob(authorId) {
  const titleFr = 'Responsable du développement commercial';
  const titleEn = 'Business Developer';
  const company = 'Gozem';
  const location = 'Douala, Littoral';

  const duplicates = await prisma.job.findMany({
    where: {
      company,
      OR: [
        { title: titleFr },
        { title: titleEn },
        { titleFr },
        { titleEn },
      ],
    },
    orderBy: { id: 'asc' },
    select: { id: true, reference: true },
  });

  let keeper = duplicates[0] || null;
  const reference = keeper?.reference || await generateUniqueReference();

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
    description: buildDescription(),
    descriptionFr: buildDescription(),
    descriptionEn: buildDescriptionEn(),
    authorId,
  };

  if (!keeper) {
    const created = await prisma.job.create({
      data,
      select: { id: true, title: true, company: true, reference: true, externalApplyUrl: true, status: true },
    });
    return { job: created, removedDuplicates: 0, mode: 'created' };
  }

  const updated = await prisma.job.update({
    where: { id: keeper.id },
    data,
    select: { id: true, title: true, company: true, reference: true, externalApplyUrl: true, status: true },
  });

  const redundantIds = duplicates.slice(1).map((d) => d.id);
  let removedDuplicates = 0;
  if (redundantIds.length > 0) {
    const deleted = await prisma.job.deleteMany({ where: { id: { in: redundantIds } } });
    removedDuplicates = deleted.count;
  }

  return { job: updated, removedDuplicates, mode: 'updated' };
}

async function main() {
  console.log('Seed Gozem: demarrage...');

  const author = await ensureGozemAuthor();
  const { job, removedDuplicates, mode } = await upsertGozemJob(author.id);

  console.log(`Auteur Gozem utilise: ${author.id} (${author.email})`);
  console.log(`Mode: ${mode}`);
  console.log(`Doublons supprimes: ${removedDuplicates}`);
  console.log(`Offre synchronisee: ${job.title} - ${job.company} [${job.reference}]`);
  console.log(`Lien externe: ${job.externalApplyUrl}`);
  console.log(`Statut: ${job.status}`);
}

main()
  .catch((error) => {
    console.error('Seed Gozem: echec', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
