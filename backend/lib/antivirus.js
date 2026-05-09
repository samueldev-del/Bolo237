'use strict';

/**
 * Scan antivirus pour les uploads (CVs, doc identité, images de profil).
 *
 * Stratégie : opt-in via env var. Si `CLAMAV_ENABLED !== 'true'` (ou si la lib
 * `clamscan` n'est pas installée), le scan est ignoré silencieusement et les
 * uploads continuent de fonctionner. C'est volontaire : on ne veut pas casser
 * la prod si le sidecar ClamAV est temporairement indisponible.
 *
 * Pour activer en prod :
 *   1. `npm i clamscan` dans backend/.
 *   2. Déployer un sidecar ClamAV (ex. `clamav/clamav-debian:latest`) avec
 *      port 3310 exposé.
 *   3. Définir CLAMAV_ENABLED=true, CLAMAV_HOST=<host>, CLAMAV_PORT=3310.
 *
 * Note RGPD : on préfère ClamAV (auto-hébergé, données ne quittent pas
 * l'infra) à VirusTotal qui transmet le binaire à un tiers US — incompatible
 * avec le traitement des CVs et docs identité d'utilisateurs UE.
 */

const ENABLED = String(process.env.CLAMAV_ENABLED || 'false').toLowerCase() === 'true';
const HOST = String(process.env.CLAMAV_HOST || '').trim() || 'localhost';
const PORT = Number(process.env.CLAMAV_PORT) > 0 ? Number(process.env.CLAMAV_PORT) : 3310;
const TIMEOUT_MS = Number(process.env.CLAMAV_TIMEOUT_MS) > 0
  ? Number(process.env.CLAMAV_TIMEOUT_MS)
  : 30_000;

let clamReady = null;
let clamLoadFailed = false;

async function getClam() {
  if (!ENABLED) return null;
  if (clamLoadFailed) return null;
  if (clamReady) return clamReady;

  try {
    // Import paresseux : la lib n'est pas listée dans dependencies par défaut
    // pour permettre un déploiement sans antivirus.
    const NodeClam = require('clamscan');
    clamReady = await new NodeClam().init({
      removeInfected: false,
      debugMode: false,
      clamdscan: {
        host: HOST,
        port: PORT,
        timeout: TIMEOUT_MS,
        localFallback: false,
        bypassTest: false,
      },
    });
    console.log(`✅ [antivirus] ClamAV connecte sur ${HOST}:${PORT}`);
    return clamReady;
  } catch (err) {
    clamLoadFailed = true;
    console.error(`⚠️ [antivirus] ClamAV indisponible (${err.message}). Scan desactive.`);
    return null;
  }
}

/**
 * Scanne un Buffer (sortie multer.memoryStorage). Retourne :
 *   - { scanned: false } si le scan est désactivé/indisponible.
 *   - { scanned: true, infected: false }
 *   - { scanned: true, infected: true, viruses: [...] } et lance une exception
 *     que l'appelant peut traduire en 422.
 *
 * En cas d'erreur de scan (timeout, daemon down), on logue mais on n'échoue
 * pas l'upload — fail-open volontaire pour ne pas bloquer la prod.
 */
async function scanBuffer(buffer, hint = 'upload') {
  if (!ENABLED) return { scanned: false };
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return { scanned: false };

  const clam = await getClam();
  if (!clam) return { scanned: false };

  try {
    const { Readable } = require('stream');
    const stream = Readable.from(buffer);
    const { isInfected, viruses } = await clam.scanStream(stream);

    if (isInfected) {
      const message = `Fichier infecte (${viruses.join(', ')}) detecte sur ${hint}`;
      console.error(`🦠 [antivirus] ${message}`);
      const err = new Error(message);
      err.code = 'AV_INFECTED';
      err.viruses = viruses;
      throw err;
    }

    return { scanned: true, infected: false };
  } catch (err) {
    if (err.code === 'AV_INFECTED') throw err;
    // Erreur de scan ≠ infection : on logue et on laisse passer (fail-open).
    console.error(`⚠️ [antivirus] Scan ${hint} echec : ${err.message}`);
    return { scanned: false };
  }
}

module.exports = {
  scanBuffer,
};
