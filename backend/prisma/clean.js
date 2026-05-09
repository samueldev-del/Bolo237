/**
 * 🧹 Script de nettoyage — Vide toutes les tables sans toucher à la structure.
 *
 * Usage :  node prisma/clean.js
 *          npm run db:clean
 */

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clean() {
  console.log('\n🧹  Nettoyage de la base de données...\n');

  const cleanupSteps = [
    ['sessions revoquees', () => prisma.revokedSession.deleteMany({})],
    ['codes OTP', () => prisma.otpCode.deleteMany({})],
    ['signalements', () => prisma.report.deleteMany({})],
    ['notifications', () => prisma.notification.deleteMany({})],
    ['demandes confidentialite', () => prisma.privacyRequest.deleteMany({})],
    ['feedbacks app', () => prisma.appFeedback.deleteMany({})],
    ['avis utilisateurs', () => prisma.userReview.deleteMany({})],
    ['clics artisans', () => prisma.contactClickEvent.deleteMany({})],
    ['profils candidats', () => prisma.candidateProfile.deleteMany({})],
    ['profils utilisateurs', () => prisma.userProfile.deleteMany({})],
    ['favoris jobs', () => prisma.savedJob.deleteMany({})],
    ['candidatures', () => prisma.application.deleteMany({})],
    ['alertes emploi', () => prisma.jobAlert.deleteMany({})],
    ['services artisans', () => prisma.artisanService.deleteMany({})],
    ['portfolios artisans', () => prisma.artisanPortfolio.deleteMany({})],
    ['verifications', () => prisma.verificationSubmission.deleteMany({})],
    ['tickets support', () => prisma.supportTicket.deleteMany({})],
    ["offres d'emploi", () => prisma.job.deleteMany({})],
    ['utilisateurs', () => prisma.user.deleteMany({})],
  ];

  for (const [label, runDelete] of cleanupSteps) {
    const result = await runDelete();
    console.log(`   ✓ ${result.count} ${label} supprime(s)`);
  }

  const stats = {
    users: await prisma.user.count(),
    jobs: await prisma.job.count(),
    applications: await prisma.application.count(),
    savedJobs: await prisma.savedJob.count(),
    reports: await prisma.report.count(),
    notifications: await prisma.notification.count(),
    supportTickets: await prisma.supportTicket.count(),
  };

  console.log('\n📊  Vérification finale :');
  console.log(
    `   Users: ${stats.users} | Jobs: ${stats.jobs} | Applications: ${stats.applications} | SavedJobs: ${stats.savedJobs} | Reports: ${stats.reports} | Notifications: ${stats.notifications} | SupportTickets: ${stats.supportTickets}`
  );

  if (
    stats.users === 0 &&
    stats.jobs === 0 &&
    stats.applications === 0 &&
    stats.savedJobs === 0 &&
    stats.reports === 0 &&
    stats.notifications === 0 &&
    stats.supportTickets === 0
  ) {
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
