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

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_POOL_CONN_TIMEOUT_MS) || 10000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = { prisma, pool };
