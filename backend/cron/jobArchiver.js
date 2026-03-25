const cron = require('node-cron');

/**
 * Cron Job: Archivage automatique des offres expirées
 * Exécution: tous les jours à minuit (0 0 * * *)
 * @param {import('@prisma/client').PrismaClient} prisma - Instance Prisma partagée
 */
const startJobArchiver = (prisma) => {
  if (!prisma) {
    console.error('❌ [CRON] Impossible de démarrer : instance Prisma manquante.');
    return;
  }

  // Tous les jours à minuit
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 [CRON] Lancement du nettoyage automatique des offres expirées...');

    try {
      // 1. Archiver les offres APPROVED de plus de 30 jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const archived = await prisma.job.updateMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          status: 'APPROVED',
        },
        data: {
          status: 'ARCHIVED',
        },
      });

      // 2. Supprimer les notifications lues de plus de 60 jours
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const deletedNotifs = await prisma.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: { lt: sixtyDaysAgo },
        },
      });

      console.log(`✅ [CRON] Nettoyage terminé : ${archived.count} offre(s) archivée(s), ${deletedNotifs.count} notification(s) supprimée(s).`);
    } catch (error) {
      console.error('❌ [CRON] Erreur lors du nettoyage :', error);
    }
  });

  console.log('⏰ [CRON] Robot Nettoyeur armé (Exécution prévue à minuit).');
};

module.exports = startJobArchiver;
