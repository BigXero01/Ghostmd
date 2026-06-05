import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  // Netlify automatically applies migrations found in this directory at deploy time.
  out: 'netlify/database/migrations',
});
