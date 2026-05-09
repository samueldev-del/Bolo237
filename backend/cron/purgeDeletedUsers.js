'use strict';

const cron = require('node-cron');

const { purgeExpiredUsers, PURGE_DELAY_DAYS } = require('../lib/softDelete');

/**
 * Cron RGPD : purge définitive des comptes utilisateurs soft-deletés depuis
 * plus de PURGE_DELAY_DAYS (30 par défaut). Exécution quotidienne à 03h15
 * pour éviter de chevaucher le jobArchiver (00h00) et l'alertes mailer.
 *
 * Désactivable via RGPD_PURGE_ENABLED=false (utile en pré-prod / test).
 */
function startPurgeDeletedUsers() {
  if (String(process.env.RGPD_PURGE_ENABLED || 'true').toLowerCase() === 'false') {
    console.log('ℹ️  [CRON RGPD] Purge des comptes supprimes desactivee (RGPD_PURGE_ENABLED=false).');
    return;
  }

  cron.schedule('15 3 * * *', async () => {
    try {
      const count = await purgeExpiredUsers();
      console.log(
        `🧹 [CRON RGPD] ${count} compte(s) purge(s) (deletedAt > ${PURGE_DELAY_DAYS} jours).`,
      );
    } catch (error) {
      console.error('❌ [CRON RGPD] Erreur durant la purge :', error?.message || error);
    }
  });

  console.log(`✅ [CRON RGPD] Purge programmee (delai ${PURGE_DELAY_DAYS}j, 03:15 quotidien).`);
}

module.exports = startPurgeDeletedUsers;
