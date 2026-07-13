import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';

/** Applies pending Drizzle migrations from ./drizzle, then exits. */
async function main() {
  console.log('⏳ Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Migrations applied.');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
