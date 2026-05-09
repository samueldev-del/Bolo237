const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { validateSecurityConfiguration } = require('./security');

function getDatabaseUrl() {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  return databaseUrl;
}

const DATABASE_URL = getDatabaseUrl();
validateSecurityConfiguration(DATABASE_URL);

// Diagnostic boot : log l'URL que pg.Pool tente d'utiliser (sans password).
// Permet de vérifier que DATABASE_URL injectée par Render correspond bien à
// ce qui est attendu (host pooled, user, db). Ne fuite jamais le password.
try {
  const u = new URL(DATABASE_URL);
  const pwLen = u.password ? u.password.length : 0;
  console.log(
    `[db] connecting to ${u.hostname}:${u.port || 5432} as ${u.username} (db=${u.pathname.slice(1) || '?'}, sslmode=${u.searchParams.get('sslmode') || 'default'}, password.length=${pwLen})`,
  );
} catch (err) {
  console.error('[db] DATABASE_URL parse failed:', err?.message || err);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_POOL_CONN_TIMEOUT_MS) || 10000,
});

// Test de connexion immédiat au boot — si le password est cassé, on le saura
// dans les logs sans attendre la première requête utilisateur.
pool
  .query('SELECT 1 as ok')
  .then(() => console.log('[db] ✅ initial connection succeeded'))
  .catch((err) => console.error(`[db] ❌ initial connection FAILED: ${err.code || ''} ${err.message || err}`));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = { prisma, pool };
