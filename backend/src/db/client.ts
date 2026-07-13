import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../config/env';
import * as schema from './schema';

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for database access. See backend/.env.example.');
}

/** Shared connection pool for the process. */
export const pool = new Pool({ connectionString: env.DATABASE_URL });

/** Drizzle client, schema-aware so relational queries (`db.query.*`) work. */
export const db = drizzle(pool, { schema });

export type DB = typeof db;
export { schema };
