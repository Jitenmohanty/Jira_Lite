import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const t = await c.query("select table_name from information_schema.tables where table_schema='public' order by 1");
console.log('TABLES:', t.rows.map(r=>r.table_name).join(', ') || '(none)');
const cols = await c.query("select column_name from information_schema.columns where table_name='users' order by 1");
console.log('users COLUMNS:', cols.rows.map(r=>r.column_name).join(', ') || '(no users table)');
try { const u = await c.query('select count(*)::int n from users'); console.log('users COUNT:', u.rows[0].n); }
catch(e){ console.log('users COUNT err:', e.message); }
await c.end();
