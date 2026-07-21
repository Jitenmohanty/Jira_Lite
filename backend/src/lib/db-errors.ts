/**
 * Postgres error helpers. `node-postgres` surfaces the SQLSTATE on `err.code`;
 * Drizzle may wrap the driver error, so we also check `err.cause`.
 */

/** True for a Postgres unique-constraint violation (SQLSTATE 23505). */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}
