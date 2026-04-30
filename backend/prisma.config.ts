import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Force la lecture du fichier .env
dotenv.config();

export default defineConfig({
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});