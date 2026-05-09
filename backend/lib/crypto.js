'use strict';

/**
 * Chiffrement applicatif AES-256-GCM pour les champs PII (téléphone, doc identité…).
 *
 * Les valeurs chiffrées sont sérialisées en `v1:<iv-hex>:<tag-hex>:<ct-hex>`.
 * Le préfixe de version permet de tourner les clés à terme sans casser les
 * lectures (cf. `decrypt` qui rejette les versions inconnues).
 *
 * Pour les recherches `findUnique`, on stocke en parallèle un HMAC-SHA256
 * déterministe (`lookupHash`) calculé avec une clé distincte. Cela permet
 * d'indexer/chercher sans déchiffrer ET sans exposer les valeurs en clair.
 *
 * Variables d'environnement requises :
 *   - DATA_ENCRYPTION_KEY    : 32 bytes hex (clé symétrique AES-256-GCM).
 *   - DATA_LOOKUP_HMAC_KEY   : 32 bytes hex (clé HMAC-SHA256 lookup).
 *
 * Génération conseillée :
 *   openssl rand -hex 32
 */

const crypto = require('crypto');

const ENC_KEY_HEX = String(process.env.DATA_ENCRYPTION_KEY || '').trim();
const HMAC_KEY_HEX = String(process.env.DATA_LOOKUP_HMAC_KEY || '').trim();

let encKey = null;
let hmacKey = null;

function loadKeys() {
  if (encKey && hmacKey) return;

  if (process.env.NODE_ENV === 'production') {
    if (!ENC_KEY_HEX || !HMAC_KEY_HEX) {
      throw new Error(
        'DATA_ENCRYPTION_KEY et DATA_LOOKUP_HMAC_KEY sont obligatoires en production.',
      );
    }
  }

  if (ENC_KEY_HEX) {
    const buf = Buffer.from(ENC_KEY_HEX, 'hex');
    if (buf.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY doit faire 32 bytes (64 hex chars).');
    }
    encKey = buf;
  } else {
    // Dev only fallback : clé déterministe non sécurisée pour ne pas bloquer
    // l'onboarding local. Ne sera JAMAIS atteint en prod (throw plus haut).
    encKey = crypto.createHash('sha256').update('bolo237-dev-only-encryption-key').digest();
    console.warn('[crypto] DATA_ENCRYPTION_KEY non defini — usage cle de developpement.');
  }

  if (HMAC_KEY_HEX) {
    const buf = Buffer.from(HMAC_KEY_HEX, 'hex');
    if (buf.length !== 32) {
      throw new Error('DATA_LOOKUP_HMAC_KEY doit faire 32 bytes (64 hex chars).');
    }
    hmacKey = buf;
  } else {
    hmacKey = crypto.createHash('sha256').update('bolo237-dev-only-hmac-key').digest();
    console.warn('[crypto] DATA_LOOKUP_HMAC_KEY non defini — usage cle de developpement.');
  }
}

const VERSION = 'v1';

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  loadKeys();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

function decrypt(payload) {
  if (!payload) return null;
  loadKeys();
  const parts = String(payload).split(':');
  if (parts.length !== 4) throw new Error('Payload chiffre invalide.');
  const [version, ivHex, tagHex, ctHex] = parts;
  if (version !== VERSION) {
    throw new Error(`Version de chiffrement non supportee: ${version}`);
  }
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/**
 * Hash HMAC-SHA256 déterministe pour indexer une valeur sans l'exposer.
 * Renvoie une string hex (64 chars). Sûr pour `where: { phoneHash: ... }`.
 */
function lookupHash(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  loadKeys();
  return crypto.createHmac('sha256', hmacKey).update(String(plaintext)).digest('hex');
}

/**
 * Détecte si une valeur stockée semble déjà chiffrée (préfixe version connu).
 * Utile pour des migrations idempotentes : on ne re-chiffre pas une valeur
 * déjà chiffrée par mégarde.
 */
function isEncrypted(value) {
  if (typeof value !== 'string') return false;
  return value.startsWith(`${VERSION}:`);
}

module.exports = {
  encrypt,
  decrypt,
  lookupHash,
  isEncrypted,
};
