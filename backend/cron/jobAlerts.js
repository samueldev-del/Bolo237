const cron = require('node-cron');
const { transporter } = require('../lib/emailService');
const { runJobAlertsDigest } = require('../lib/jobAlerts');
const { sendTransactionalEmail } = require('../lib/transactionalEmail');

function isCronEnabled() {
  return String(process.env.JOB_ALERTS_CRON_ENABLED || 'true').trim().toLowerCase() !== 'false';
}

function startJobAlertsCron(prisma) {
  if (!prisma) {
    console.error('❌ [CRON][JOB ALERTS] Impossible de démarrer : instance Prisma manquante.');
    return null;
  }

  if (!isCronEnabled()) {
    console.log('⏸️ [CRON][JOB ALERTS] Désactivé par configuration.');
    return null;
  }

  const schedule = String(process.env.JOB_ALERTS_CRON_SCHEDULE || '5 * * * *').trim();
  const timezone = String(process.env.JOB_ALERTS_CRON_TIMEZONE || 'Africa/Douala').trim();

  const task = cron.schedule(schedule, async () => {
    console.log('🔔 [CRON][JOB ALERTS] Analyse des nouvelles offres pour les alertes actives...');

    try {
      const summary = await runJobAlertsDigest({
        prisma,
        sendEmail: ({ user, payload }) => sendTransactionalEmail({
          transporter,
          to: user?.email,
          ...payload,
        }),
      });

      console.log(
        `✅ [CRON][JOB ALERTS] Terminé : ${summary.processed}/${summary.due} alerte(s) traitée(s), `
          + `${summary.matchedJobs} offre(s) détectée(s), ${summary.emailsSent} e-mail(s) envoyé(s), `
          + `${summary.emailsSkipped} ignoré(s), ${summary.emailsErrored} erreur(s).`
      );
    } catch (error) {
      console.error('❌ [CRON][JOB ALERTS] Erreur lors du digest :', error);
    }
  }, { timezone });

  console.log(`⏰ [CRON][JOB ALERTS] Armé (${schedule}, fuseau ${timezone}).`);
  return task;
}

module.exports = startJobAlertsCron;