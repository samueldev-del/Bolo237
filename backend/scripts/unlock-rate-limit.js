'use strict';

// Charge les .env (Prisma le fait via prisma.config.ts, pas Node natif).
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Purge les compteurs rate-limit Redis pour un identifier ou une IP donnés.
 * Utile pour débloquer un compte admin lockout après 5 échecs de login.
 *
 * Usage :
 *   node backend/scripts/unlock-rate-limit.js --id admin@bolo237.com
 *   node backend/scripts/unlock-rate-limit.js --ip 37.5.242.238
 *   node backend/scripts/unlock-rate-limit.js --all          # purge tout (DANGEREUX en prod)
 *   node backend/scripts/unlock-rate-limit.js --list         # liste les clés actives
 */

const { getRedisClient, getRedisUrl } = require('../lib/redis');

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

const PREFIX = String(process.env.RATE_LIMIT_REDIS_PREFIX || 'rl:').trim() || 'rl:';

async function main() {
  if (!getRedisUrl()) {
    console.error('❌ REDIS_URL non defini. Le rate-limit utilise le fallback in-memory.');
    console.error('   Si le backend tourne sur Render avec Redis, definis REDIS_URL en local pour purger.');
    process.exit(1);
  }

  const client = await getRedisClient();
  if (!client) {
    console.error('❌ Connexion Redis impossible.');
    process.exit(1);
  }

  if (args.includes('--list')) {
    const keys = await client.sendCommand(['KEYS', `${PREFIX}*`]);
    console.log(`📋 Clés actives (prefix=${PREFIX}) : ${keys.length}`);
    for (const key of keys.slice(0, 50)) {
      const ttl = await client.sendCommand(['TTL', key]);
      console.log(`  ${key}  (TTL: ${ttl}s)`);
    }
    if (keys.length > 50) console.log(`  ... et ${keys.length - 50} autres`);
    await client.quit();
    return;
  }

  const identifier = getArg('--id');
  const ip = getArg('--ip');
  const all = args.includes('--all');

  let pattern;
  if (all) {
    pattern = `${PREFIX}*`;
    console.log(`⚠️  Mode --all : purge TOUS les compteurs rate-limit (${pattern}).`);
  } else if (identifier) {
    pattern = `${PREFIX}*:${String(identifier).toLowerCase()}`;
  } else if (ip) {
    pattern = `${PREFIX}*:${ip}`;
  } else {
    console.error('Usage : --id <email|phone> | --ip <ip> | --all | --list');
    await client.quit();
    process.exit(1);
  }

  const keys = await client.sendCommand(['KEYS', pattern]);
  console.log(`🔍 ${keys.length} clé(s) correspondant à ${pattern}`);

  if (keys.length === 0) {
    console.log('Rien à purger.');
    await client.quit();
    return;
  }

  for (const key of keys) {
    await client.sendCommand(['DEL', key]);
    console.log(`  ✅ DEL ${key}`);
  }

  console.log(`\n✅ ${keys.length} compteur(s) supprimé(s).`);
  await client.quit();
}

main().catch(async (err) => {
  console.error('❌ Erreur fatale :', err);
  process.exit(1);
});
