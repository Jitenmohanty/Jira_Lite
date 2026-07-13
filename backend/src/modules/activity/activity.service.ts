import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { activity } from '../../db/schema';

export async function listActivity(orgId: string, limit: number, offset: number) {
  return db.query.activity.findMany({
    where: eq(activity.orgId, orgId),
    with: { actor: { columns: { id: true, name: true, avatarUrl: true } } },
    orderBy: [desc(activity.createdAt)],
    limit,
    offset,
  });
}
