const fs = require('node:fs/promises');
const path = require('node:path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { prisma, pool } = require('../lib/db');

const EXTERNAL_APPLY_URL = 'https://jobs.ashbyhq.com/The-Flex/79cf4d28-e152-4817-b690-7d2ad5992076';
const FLEX_LOGO_PUBLIC_PATH = '/companies/flex-living.png';

function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'BOLO-';
  for (let i = 0; i < 5; i += 1) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

async function generateUniqueReference() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateReference();
    const exists = await prisma.job.findUnique({ where: { reference: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error('Impossible de generer une reference unique BOLO-XXXXX apres 20 tentatives.');
}

async function ensureFlexLogoFile() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const targetDir = path.join(repoRoot, 'frontend', 'public', 'companies');
  const targetFile = path.join(targetDir, 'flex-living.png');

  const candidateSources = [
    path.join(repoRoot, 'flex living.png'),
    path.join(repoRoot, 'frontend', 'public', 'flex living.png'),
    path.join(repoRoot, 'frontend', 'public', 'flex-living.png'),
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
    throw new Error('Fichier logo introuvable. Placez "flex living.png" dans la racine du repo ou frontend/public/.');
  }

  await fs.mkdir(targetDir, { recursive: true });
  if (path.resolve(sourceFile) !== path.resolve(targetFile)) {
    await fs.copyFile(sourceFile, targetFile);
  }

  return FLEX_LOGO_PUBLIC_PATH;
}

function buildJobs() {
  const common = {
    company: 'Flex Living',
    location: 'A distance / Remote',
    salary: 'Temps plein',
    status: 'APPROVED',
    externalApplyUrl: EXTERNAL_APPLY_URL,
  };

  return [
    {
      ...common,
      title: 'Founding Engineer',
      description: [
        '## A propos du role',
        'Flex Living recherche un Founding Engineer pour poser les fondations techniques de la plateforme, accelerer les cycles de delivery et transformer une vision produit ambitieuse en execution robuste.',
        'Vous travaillerez en lien direct avec les fondateurs sur les decisions d architecture, la qualite logicielle et la scalabilite de bout en bout.',
        '',
        '## Responsabilites cles',
        '- Definir l architecture applicative et les standards de developpement pour une stack web moderne.',
        '- Concevoir et livrer des fonctionnalites produit critiques avec un haut niveau de fiabilite.',
        '- Mettre en place l observabilite, la strategie de tests et les garde-fous de securite.',
        '- Construire les pratiques d engineering (code review, CI/CD, ownership technique).',
        '- Collaborer etroitement avec Product et Design pour prioriser l impact business.',
        '',
        '## Qualifications requises',
        '- Excellente maitrise JavaScript/TypeScript et experience solide sur architectures web distribuees.',
        '- Capacite prouvee a livrer vite sans compromettre la qualite ni la maintenabilite.',
        '- Exposition a des environnements startup a forte croissance et forte ambiguite.',
        '- Communication claire, sens du produit, autonomie et esprit entrepreneurial.',
      ].join('\n'),
    },
    {
      ...common,
      title: 'Full-Stack Engineer (Web & APIs)',
      description: [
        '## A propos du role',
        'En tant que Full-Stack Engineer (Web & APIs), vous developpez des experiences utilisateurs rapides et des API fiables qui soutiennent des parcours critiques de conversion et d exploitation.',
        'Le poste combine execution produit, excellence technique et collaboration transversale.',
        '',
        '## Responsabilites cles',
        '- Implementer des interfaces web performantes, accessibles et pixel-precises.',
        '- Concevoir des APIs claires, documentees et resilientes pour les besoins metier.',
        '- Optimiser les performances applicatives et la qualite des donnees.',
        '- Participer a la definition des evolutions du modele de donnees et des contrats d API.',
        '- Contribuer aux rituels d equipe, a la qualite du code et a l amelioration continue.',
        '',
        '## Qualifications requises',
        '- Experience confirmee en developpement full-stack sur des produits en production.',
        '- Bonnes pratiques de test, monitoring, gestion d erreurs et securisation des flux.',
        '- Maitrise des bases SQL et des integrations avec services tiers.',
        '- Capacite a prioriser selon la valeur utilisateur et les contraintes business.',
      ].join('\n'),
    },
    {
      ...common,
      title: 'Lead Full-Stack Engineer',
      description: [
        '## A propos du role',
        'Le Lead Full-Stack Engineer pilote la trajectoire technique de l equipe produit et garantit la livraison de fonctionnalites strategiques avec un niveau eleve de qualite.',
        'Ce role allie leadership d execution, arbitrage architectural et mentorat au quotidien.',
        '',
        '## Responsabilites cles',
        '- Structurer la roadmap technique en coherence avec les priorites produit.',
        '- Encadrer les pratiques de developpement et elever les standards d engineering.',
        '- Mener les choix d architecture, de dette technique et de performance.',
        '- Coordonner la livraison de chantiers transverses web, API et data applicative.',
        '- Accompagner la montee en competence des ingenieurs via feedback et mentoring.',
        '',
        '## Qualifications requises',
        '- Parcours solide en full-stack sur des environnements produit exigeants.',
        '- Experience de leadership technique avec impact mesurable sur les equipes.',
        '- Excellente capacite de communication interdisciplinaire et prise de decision.',
        '- Sens de l ownership, de la qualite et de la fiabilite operationnelle.',
      ].join('\n'),
    },
    {
      ...common,
      title: 'Senior Product Engineer',
      description: [
        '## A propos du role',
        'Le Senior Product Engineer est au coeur de l execution produit : transformer des problemes utilisateurs complexes en experiences simples, robustes et mesurables.',
        'Vous travaillez en proximite avec Product et Design pour accelerer l impact business.',
        '',
        '## Responsabilites cles',
        '- Prendre en charge des epics produits de bout en bout, de la conception au deploiement.',
        '- Definir des solutions techniques pragmatiques alignees sur les objectifs de croissance.',
        '- Mesurer et ameliorer les parcours via experimentation et instrumentation produit.',
        '- Identifier les points de friction et piloter des ameliorations a fort levier.',
        '- Partager les bonnes pratiques de product engineering au sein de l equipe.',
        '',
        '## Qualifications requises',
        '- Experience significative en delivery produit dans des environnements web SaaS.',
        '- Forte sensibilite UX et capacite a equilibrer vitesse, qualite et dette technique.',
        '- Solides competences en architecture applicative et modelisation des flux.',
        '- Orientation resultat et culture de l experimentation.',
      ].join('\n'),
    },
    {
      ...common,
      title: 'Senior Software Engineer',
      description: [
        '## A propos du role',
        'Flex Living recherche un Senior Software Engineer pour faire evoluer sa plateforme a l echelle, renforcer sa resilence et soutenir une croissance internationale.',
        'Vous interviendrez sur des sujets de performance, de fiabilite et d industrialisation logicielle.',
        '',
        '## Responsabilites cles',
        '- Concevoir, implementer et operer des composants critiques en production.',
        '- Ameliorer la performance, la disponibilite et la tolerance aux pannes.',
        '- Renforcer les standards de securite, observabilite et gouvernance technique.',
        '- Participer a la revue d architecture et a la resolution d incidents complexes.',
        '- Contribuer au partage de connaissances et a la qualite globale du codebase.',
        '',
        '## Qualifications requises',
        '- Expertise solide en engineering backend/full-stack sur produits a trafic reel.',
        '- Excellente maitrise des patterns de conception et des pratiques de resilience.',
        '- Experience des pipelines CI/CD, du monitoring et du debugging avance.',
        '- Rigueur, autonomie, sens du collectif et forte culture de l impact.',
      ].join('\n'),
    },
  ];
}

async function ensureSystemAuthor(logoPath) {
  const email = 'system@bolo237.com';
  const passwordHash = await bcrypt.hash('Bolo237-System-Seed-2026!', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Bolo237 Partenaires',
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
    create: {
      email,
      password: passwordHash,
      name: 'Bolo237 Partenaires',
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: logoPath,
    },
  });

  return user;
}

async function upsertFlexJob(jobData, authorId) {
  const existing = await prisma.job.findFirst({
    where: {
      authorId,
      company: jobData.company,
      title: jobData.title,
    },
    select: { id: true, reference: true },
  });

  const reference = existing?.reference || await generateUniqueReference();

  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data: {
        reference,
        externalApplyUrl: jobData.externalApplyUrl,
        status: jobData.status,
        location: jobData.location,
        salary: jobData.salary,
        description: jobData.description,
        company: jobData.company,
      },
    });
  }

  return prisma.job.create({
    data: {
      reference,
      title: jobData.title,
      company: jobData.company,
      location: jobData.location,
      description: jobData.description,
      salary: jobData.salary,
      externalApplyUrl: jobData.externalApplyUrl,
      status: jobData.status,
      authorId,
    },
  });
}

async function main() {
  console.log('Seed Flex Living: demarrage...');

  const logoPath = await ensureFlexLogoFile();
  const author = await ensureSystemAuthor(logoPath);

  const jobs = buildJobs();
  const created = [];

  for (const job of jobs) {
    const saved = await upsertFlexJob(job, author.id);
    created.push(saved);
    console.log(`- ${saved.title} [${saved.reference}]`);
  }

  console.log(`Seed Flex Living termine: ${created.length} offres synchronisees.`);
}

main()
  .catch((error) => {
    console.error('Seed Flex Living: echec', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
