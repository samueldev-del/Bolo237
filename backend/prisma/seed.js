const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Créer des utilisateurs
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'recruteur@techcamer.cm' },
      update: {},
      create: {
        email: 'recruteur@techcamer.cm',
        password: 'hashed_password_placeholder',
        name: 'TechCamer RH',
        role: 'ENTREPRISE',
        isVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'hr@mtn.cm' },
      update: {},
      create: {
        email: 'hr@mtn.cm',
        password: 'hashed_password_placeholder',
        name: 'MTN Cameroun RH',
        role: 'ENTREPRISE',
        isVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'rh@orange.cm' },
      update: {},
      create: {
        email: 'rh@orange.cm',
        password: 'hashed_password_placeholder',
        name: 'Orange Cameroun',
        role: 'ENTREPRISE',
        isVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'alain.tchoumi@email.com' },
      update: {},
      create: {
        email: 'alain.tchoumi@email.com',
        password: 'hashed_password_placeholder',
        name: 'Alain Tchoumi',
        role: 'CANDIDAT',
        isVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'jean.mvondo@email.com' },
      update: {},
      create: {
        email: 'jean.mvondo@email.com',
        password: 'hashed_password_placeholder',
        name: 'Jean Mvondo',
        role: 'ARTISAN',
        isVerified: true,
      },
    }),
  ]);

  console.log(`  ${users.length} utilisateurs créés/mis à jour.`);

  // 2. Créer des offres d'emploi
  const jobsData = [
    {
      title: 'Développeur Web React.js',
      company: 'TechCamer Solutions',
      location: 'Douala, Akwa',
      description:
        "Nous recherchons un développeur React.js passionné pour rejoindre notre équipe technique. Vous participerez à la conception et au développement de solutions web innovantes pour nos clients locaux et internationaux. Stack technique : React, Next.js, TypeScript, Node.js, PostgreSQL.",
      salary: '300 000 – 400 000 FCFA',
      authorId: users[0].id,
      status: 'APPROVED',
    },
    {
      title: 'Comptable Junior (H/F)',
      company: 'K-Finance SA',
      location: 'Douala, Bonanjo',
      description:
        "Stage de 6 mois en comptabilité générale au sein d'un cabinet reconnu. Missions : saisie comptable, rapprochement bancaire, préparation des bilans et déclarations fiscales. Encadrement par un expert-comptable senior.",
      salary: null,
      authorId: users[0].id,
      status: 'APPROVED',
    },
    {
      title: 'Responsable Marketing Digital',
      company: 'MTN Cameroun',
      location: 'Yaoundé, Bastos',
      description:
        "Pilotage de la stratégie de communication digitale pour l'ensemble de la marque MTN au Cameroun. Gestion des réseaux sociaux, campagnes Meta/Google Ads, analyse des performances et reporting mensuel à la direction.",
      salary: '450 000 – 600 000 FCFA',
      authorId: users[1].id,
      status: 'APPROVED',
    },
    {
      title: 'Ingénieur Génie Civil',
      company: 'BATIGROUP SA',
      location: 'Bafoussam',
      description:
        "Supervision de chantiers d'infrastructure publique dans la région Ouest. Coordination des équipes terrain, contrôle qualité des matériaux, respect des délais et du budget. Déplacements fréquents sur site.",
      salary: '350 000 – 500 000 FCFA',
      authorId: users[0].id,
      status: 'APPROVED',
    },
    {
      title: 'Data Analyst',
      company: 'Orange Cameroun',
      location: 'Douala',
      description:
        "Analyse des données clients pour la direction commerciale. Modélisation prédictive, création de dashboards Power BI, rapports de performance et recommandations stratégiques. Profil Bac+4/5 en statistiques ou data science.",
      salary: '400 000 – 550 000 FCFA',
      authorId: users[2].id,
      status: 'APPROVED',
    },
    {
      title: 'Commercial Terrain B2B (H/F)',
      company: 'Orange Cameroun',
      location: 'Bafoussam',
      description:
        "Développement du portefeuille client entreprises sur la région Ouest. Prospection terrain, présentation des offres télécoms B2B, négociation et suivi des contrats. Véhicule de fonction fourni. Rémunération : fixe + commissions.",
      salary: '250 000 FCFA + commissions',
      authorId: users[2].id,
      status: 'APPROVED',
    },
    {
      title: 'Chargée de Projet Digital',
      company: 'KmerLab',
      location: 'Douala, Bonapriso',
      description:
        "Coordination de projets digitaux pour des clients variés (e-commerce, applications mobiles, sites vitrines). Méthodologie Agile, suivi budgétaire, relation client et management d'une équipe de 4 développeurs.",
      salary: '350 000 – 450 000 FCFA',
      authorId: users[0].id,
      status: 'APPROVED',
    },
    {
      title: 'Menuisier - Fabrication de meubles',
      company: 'Particulier',
      location: 'Douala, Bonamoussadi',
      description:
        "Besoin d'un menuisier qualifié pour fabriquer sur mesure une table à manger 8 places et une étagère de salon en bois massif. Le bois est déjà acheté. Budget à discuter sur place. Intervention souhaitée cette semaine.",
      salary: '50 000 FCFA',
      authorId: users[3].id,
      status: 'APPROVED',
    },
    {
      title: 'Assistante Administrative Bilingue',
      company: 'Cabinet Juridique Etoundi & Partners',
      location: 'Yaoundé, Centre-ville',
      description:
        "Accueil des clients, gestion du courrier et des agendas, rédaction de documents juridiques en français et anglais, classement et archivage. Discrétion et rigueur exigées. Maîtrise de Word et Excel indispensable.",
      salary: '180 000 – 220 000 FCFA',
      authorId: users[1].id,
      status: 'APPROVED',
    },
    {
      title: 'Chef Cuisinier - Restaurant Haut de Gamme',
      company: 'Le Jardin des Saveurs',
      location: 'Douala, Bonanjo',
      description:
        "Restaurant gastronomique recherche un chef cuisinier expérimenté pour diriger la cuisine. Création de menus, gestion des approvisionnements, encadrement de 6 commis. Expérience minimum 5 ans en restauration haut de gamme.",
      salary: '400 000 – 500 000 FCFA',
      authorId: users[0].id,
      status: 'PENDING',
    },
  ];

  // Supprimer les offres existantes pour éviter les doublons lors du re-seed
  await prisma.job.deleteMany({});

  const jobs = [];
  for (const data of jobsData) {
    const job = await prisma.job.create({ data });
    jobs.push(job);
  }

  console.log(`  ${jobs.length} offres d'emploi créées.`);

  // 3. Créer quelques signalements
  await prisma.report.deleteMany({});
  await prisma.report.create({
    data: {
      reason: "Demande d'argent pour frais de dossier",
      targetType: 'JOB',
      targetId: jobs[jobs.length - 1].id,
      status: 'OPEN',
    },
  });

  console.log('  1 signalement créé.');
  console.log('\nSeed terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
