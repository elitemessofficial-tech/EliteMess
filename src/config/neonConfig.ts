/**
 * Neon Serverless Postgres Configuration
 */
export function getNeonDatabaseUrl(): string {
  // 1. Read environment variable if present
  if (process.env.EXPO_PUBLIC_NEON_DATABASE_URL) {
    return process.env.EXPO_PUBLIC_NEON_DATABASE_URL;
  }

  // 2. Neon Database Connection URL
  return 'postgresql://neondb_owner:npg_Eqyb8L0TRpja@ep-shiny-unit-ay6xxvz1-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
}
