import { defineConfig } from '@prisma/config';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true });

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const migrationUrl = String(process.env.DATABASE_MIGRATION_URL || databaseUrl).trim();

export default defineConfig({
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: migrationUrl || databaseUrl || undefined,
  },
});