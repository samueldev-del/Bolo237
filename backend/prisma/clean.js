/**
 * 🧹 Script de nettoyage — Vide toutes les tables sans toucher à la structure.
 *
 * Usage :  node prisma/clean.js
 *          npm run db:clean
 */

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clean() {
  console.log('\n🧹  Nettoyage de la base de données...\n');

  // Ordre important : supprimer d'abord les tables avec des FK
  const reports = await prisma.report.deleteMany({});
  console.log(`   ✓ ${reports.count} signalement(s) supprimé(s)`);

  const jobs = await prisma.job.deleteMany({});
  console.log(`   ✓ ${jobs.count} offre(s) d'emploi supprimée(s)`);

  const users = await prisma.user.deleteMany({});
  console.log(`   ✓ ${users.count} utilisateur(s) supprimé(s)`);

  // Vérification
  const stats = {
    users: await prisma.user.count(),
    jobs: await prisma.job.count(),
    reports: await prisma.report.count(),
  };

  console.log('\n📊  Vérification finale :');
  console.log(`   Users: ${stats.users} | Jobs: ${stats.jobs} | Reports: ${stats.reports}`);

  if (stats.users === 0 && stats.jobs === 0 && stats.reports === 0) {
    console.log('\n✅  Base de données vidée avec succès ! Structure intacte.\n');
  } else {
    console.log('\n⚠️  Attention : certaines données n\'ont pas été supprimées.\n');
  }
}

clean()
  .catch((e) => {
    console.error('\n❌  Erreur lors du nettoyage :', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
