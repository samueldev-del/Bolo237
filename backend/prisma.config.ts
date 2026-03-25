import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Force la lecture du fichier .env
dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});