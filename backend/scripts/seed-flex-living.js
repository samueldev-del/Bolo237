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
      titleFr: 'Ingénieur fondateur',
      titleEn: 'Founding Engineer',
      descriptionFr: [
        '## À propos du rôle',
        'Flex Living recherche un ingénieur fondateur pour poser les fondations techniques de la plateforme, accélérer les cycles de delivery et transformer une vision produit ambitieuse en exécution robuste.',
        'Vous travaillerez en lien direct avec les fondateurs sur les décisions d’architecture, la qualité logicielle et la scalabilité de bout en bout.',
        '',
        '## Responsabilités clés',
        '- Définir l’architecture applicative et les standards de développement pour une stack web moderne.',
        '- Concevoir et livrer des fonctionnalités produit critiques avec un haut niveau de fiabilité.',
        '- Mettre en place l’observabilité, la stratégie de tests et les garde-fous de sécurité.',
        '- Construire les pratiques d’engineering (code review, CI/CD, ownership technique).',
        '- Collaborer étroitement avec Product et Design pour prioriser l’impact business.',
        '',
        '## Qualifications requises',
        '- Excellente maîtrise de JavaScript/TypeScript et expérience solide sur des architectures web distribuées.',
        '- Capacité prouvée à livrer vite sans compromettre la qualité ni la maintenabilité.',
        '- Exposition à des environnements startup à forte croissance et forte ambiguïté.',
        '- Communication claire, sens du produit, autonomie et esprit entrepreneurial.',
      ].join('\n'),
      descriptionEn: [
        '## About the role',
        'Flex Living is looking for a Founding Engineer to build the platform technical foundations, accelerate delivery cycles, and turn an ambitious product vision into robust execution.',
        'You will work directly with the founders on architecture decisions, software quality, and end-to-end scalability.',
        '',
        '## Key responsibilities',
        '- Define the application architecture and engineering standards for a modern web stack.',
        '- Design and deliver critical product capabilities with a high level of reliability.',
        '- Set up observability, testing strategy, and security guardrails.',
        '- Establish engineering practices such as code review, CI/CD, and technical ownership.',
        '- Work closely with Product and Design to prioritize business impact.',
        '',
        '## Required qualifications',
        '- Strong command of JavaScript/TypeScript and solid experience with distributed web architectures.',
        '- Proven ability to move fast without compromising quality or maintainability.',
        '- Exposure to high-growth startup environments with significant ambiguity.',
        '- Clear communication, product mindset, autonomy, and entrepreneurial drive.',
      ].join('\n'),
    },
    {
      ...common,
      titleFr: 'Ingénieur full-stack (Web & APIs)',
      titleEn: 'Full-Stack Engineer (Web & APIs)',
      descriptionFr: [
        '## À propos du rôle',
        'En tant qu’ingénieur full-stack (Web & APIs), vous développez des expériences utilisateurs rapides et des API fiables qui soutiennent des parcours critiques de conversion et d’exploitation.',
        'Le poste combine exécution produit, excellence technique et collaboration transversale.',
        '',
        '## Responsabilités clés',
        '- Implémenter des interfaces web performantes, accessibles et pixel-perfect.',
        '- Concevoir des API claires, documentées et résilientes pour les besoins métier.',
        '- Optimiser les performances applicatives et la qualité des données.',
        '- Participer à la définition des évolutions du modèle de données et des contrats d’API.',
        '- Contribuer aux rituels d’équipe, à la qualité du code et à l’amélioration continue.',
        '',
        '## Qualifications requises',
        '- Expérience confirmée en développement full-stack sur des produits en production.',
        '- Bonnes pratiques de test, monitoring, gestion d’erreurs et sécurisation des flux.',
        '- Maîtrise des bases SQL et des intégrations avec des services tiers.',
        '- Capacité à prioriser selon la valeur utilisateur et les contraintes business.',
      ].join('\n'),
      descriptionEn: [
        '## About the role',
        'As a Full-Stack Engineer (Web & APIs), you will build fast user experiences and reliable APIs that power critical conversion and operational journeys.',
        'This role combines product execution, technical excellence, and cross-functional collaboration.',
        '',
        '## Key responsibilities',
        '- Implement high-performance, accessible, and pixel-perfect web interfaces.',
        '- Design clear, well-documented, and resilient APIs for business-critical use cases.',
        '- Optimize application performance and data quality.',
        '- Help shape data model evolution and API contracts.',
        '- Contribute to team rituals, code quality, and continuous improvement.',
        '',
        '## Required qualifications',
        '- Proven full-stack development experience on production-grade products.',
        '- Strong testing, monitoring, error-handling, and secure delivery practices.',
        '- Solid SQL fundamentals and experience integrating third-party services.',
        '- Ability to prioritize based on user value and business constraints.',
      ].join('\n'),
    },
    {
      ...common,
      titleFr: 'Lead ingénieur full-stack',
      titleEn: 'Lead Full-Stack Engineer',
      descriptionFr: [
        '## À propos du rôle',
        'Le lead ingénieur full-stack pilote la trajectoire technique de l’équipe produit et garantit la livraison de fonctionnalités stratégiques avec un niveau élevé de qualité.',
        'Ce rôle allie leadership d’exécution, arbitrage architectural et mentorat au quotidien.',
        '',
        '## Responsabilités clés',
        '- Structurer la roadmap technique en cohérence avec les priorités produit.',
        '- Encadrer les pratiques de développement et élever les standards d’engineering.',
        '- Mener les choix d’architecture, de dette technique et de performance.',
        '- Coordonner la livraison de chantiers transverses web, API et data applicative.',
        '- Accompagner la montée en compétence des ingénieurs via feedback et mentoring.',
        '',
        '## Qualifications requises',
        '- Parcours solide en full-stack sur des environnements produit exigeants.',
        '- Expérience de leadership technique avec impact mesurable sur les équipes.',
        '- Excellente capacité de communication interdisciplinaire et de prise de décision.',
        '- Sens de l’ownership, de la qualité et de la fiabilité opérationnelle.',
      ].join('\n'),
      descriptionEn: [
        '## About the role',
        'The Lead Full-Stack Engineer drives the product team technical direction and ensures strategic capabilities are delivered with a high bar for quality.',
        'This role combines execution leadership, architectural decision-making, and day-to-day mentorship.',
        '',
        '## Key responsibilities',
        '- Structure the technical roadmap in line with product priorities.',
        '- Coach engineering practices and raise the quality bar across the team.',
        '- Lead architecture, performance, and technical debt decisions.',
        '- Coordinate cross-functional delivery across web, APIs, and application data.',
        '- Support engineer growth through feedback and mentoring.',
        '',
        '## Required qualifications',
        '- Strong full-stack track record in demanding product environments.',
        '- Proven technical leadership experience with measurable team impact.',
        '- Excellent cross-functional communication and decision-making skills.',
        '- Strong sense of ownership, quality, and operational reliability.',
      ].join('\n'),
    },
    {
      ...common,
      titleFr: 'Ingénieur produit senior',
      titleEn: 'Senior Product Engineer',
      descriptionFr: [
        '## À propos du rôle',
        'Le senior product engineer est au cœur de l’exécution produit : transformer des problèmes utilisateurs complexes en expériences simples, robustes et mesurables.',
        'Vous travaillez en proximité avec Product et Design pour accélérer l’impact business.',
        '',
        '## Responsabilités clés',
        '- Prendre en charge des epics produits de bout en bout, de la conception au déploiement.',
        '- Définir des solutions techniques pragmatiques alignées sur les objectifs de croissance.',
        '- Mesurer et améliorer les parcours via expérimentation et instrumentation produit.',
        '- Identifier les points de friction et piloter des améliorations à fort levier.',
        '- Partager les bonnes pratiques de product engineering au sein de l’équipe.',
        '',
        '## Qualifications requises',
        '- Expérience significative en delivery produit dans des environnements web SaaS.',
        '- Forte sensibilité UX et capacité à équilibrer vitesse, qualité et dette technique.',
        '- Solides compétences en architecture applicative et modélisation des flux.',
        '- Orientation résultat et culture de l’expérimentation.',
      ].join('\n'),
      descriptionEn: [
        '## About the role',
        'The Senior Product Engineer sits at the heart of product execution: turning complex user problems into simple, reliable, and measurable experiences.',
        'You will work closely with Product and Design to accelerate business impact.',
        '',
        '## Key responsibilities',
        '- Own product epics end to end, from design through deployment.',
        '- Define pragmatic technical solutions aligned with growth objectives.',
        '- Measure and improve journeys through experimentation and product instrumentation.',
        '- Identify friction points and drive high-leverage improvements.',
        '- Share strong product engineering practices across the team.',
        '',
        '## Required qualifications',
        '- Significant product delivery experience in SaaS web environments.',
        '- Strong UX sensitivity and the ability to balance speed, quality, and technical debt.',
        '- Solid application architecture and flow modeling skills.',
        '- Results-oriented mindset with a strong experimentation culture.',
      ].join('\n'),
    },
    {
      ...common,
      titleFr: 'Ingénieur logiciel senior',
      titleEn: 'Senior Software Engineer',
      descriptionFr: [
        '## À propos du rôle',
        'Flex Living recherche un ingénieur logiciel senior pour faire évoluer sa plateforme à l’échelle, renforcer sa résilience et soutenir une croissance internationale.',
        'Vous interviendrez sur des sujets de performance, de fiabilité et d’industrialisation logicielle.',
        '',
        '## Responsabilités clés',
        '- Concevoir, implémenter et opérer des composants critiques en production.',
        '- Améliorer la performance, la disponibilité et la tolérance aux pannes.',
        '- Renforcer les standards de sécurité, d’observabilité et de gouvernance technique.',
        '- Participer à la revue d’architecture et à la résolution d’incidents complexes.',
        '- Contribuer au partage de connaissances et à la qualité globale de la base de code.',
        '',
        '## Qualifications requises',
        '- Expertise solide en engineering backend/full-stack sur des produits à trafic réel.',
        '- Excellente maîtrise des patterns de conception et des pratiques de résilience.',
        '- Expérience des pipelines CI/CD, du monitoring et du debugging avancé.',
        '- Rigueur, autonomie, sens du collectif et forte culture de l’impact.',
      ].join('\n'),
      descriptionEn: [
        '## About the role',
        'Flex Living is looking for a Senior Software Engineer to scale its platform, strengthen resilience, and support international growth.',
        'You will work on performance, reliability, and software industrialization challenges.',
        '',
        '## Key responsibilities',
        '- Design, implement, and operate production-critical components.',
        '- Improve performance, availability, and fault tolerance.',
        '- Strengthen security, observability, and technical governance standards.',
        '- Contribute to architecture reviews and the resolution of complex incidents.',
        '- Support knowledge sharing and overall codebase quality.',
        '',
        '## Required qualifications',
        '- Strong backend/full-stack engineering expertise on real-traffic products.',
        '- Excellent command of design patterns and resilience practices.',
        '- Experience with CI/CD pipelines, monitoring, and advanced debugging.',
        '- Rigor, autonomy, teamwork, and a strong impact mindset.',
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
      OR: [
        { title: jobData.titleFr },
        { title: jobData.titleEn },
        { titleFr: jobData.titleFr },
        { titleEn: jobData.titleEn },
      ],
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
        title: jobData.titleFr,
        titleFr: jobData.titleFr,
        titleEn: jobData.titleEn,
        description: jobData.descriptionFr,
        descriptionFr: jobData.descriptionFr,
        descriptionEn: jobData.descriptionEn,
        company: jobData.company,
      },
    });
  }

  return prisma.job.create({
    data: {
      reference,
      title: jobData.titleFr,
      titleFr: jobData.titleFr,
      titleEn: jobData.titleEn,
      company: jobData.company,
      location: jobData.location,
      description: jobData.descriptionFr,
      descriptionFr: jobData.descriptionFr,
      descriptionEn: jobData.descriptionEn,
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
