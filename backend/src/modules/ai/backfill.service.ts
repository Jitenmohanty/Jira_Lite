import { eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { issueEmbeddings, issues } from '../../db/schema';
import { enqueueEmbedding } from '../../queues/queues';

/**
 * Enqueues embedding jobs for every issue that has no embedding row yet — used
 * to index pre-existing data (seeds, issues created while the worker was down)
 * and run periodically as a safety net. New/edited issues are indexed inline
 * via enqueue hooks, so this normally finds nothing.
 */
export async function backfillEmbeddings(): Promise<number> {
  const missing = await db
    .select({ id: issues.id })
    .from(issues)
    .leftJoin(issueEmbeddings, eq(issueEmbeddings.issueId, issues.id))
    .where(isNull(issueEmbeddings.issueId));

  for (const row of missing) {
    await enqueueEmbedding(row.id);
  }
  return missing.length;
}
