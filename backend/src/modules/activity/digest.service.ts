import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '../../db/client';
import { activity, memberships, users } from '../../db/schema';
import { enqueueEmail } from '../../queues/queues';
import { formatActivityLine } from './activity-format';

/**
 * Builds a per-org summary of the last 24h of activity and enqueues a digest
 * email to each member. Skips orgs with no activity. Returns counts for logging.
 */
export async function runActivityDigest(): Promise<{ orgs: number; emails: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orgs = await db.query.organizations.findMany({ columns: { id: true, name: true } });

  let emails = 0;
  for (const org of orgs) {
    const items = await db.query.activity.findMany({
      where: and(eq(activity.orgId, org.id), gt(activity.createdAt, since)),
      with: { actor: { columns: { name: true } } },
      orderBy: [desc(activity.createdAt)],
      limit: 25,
    });
    if (items.length === 0) continue;

    const lines = items.map((a) => formatActivityLine(a.actor?.name ?? 'Someone', a.action, a.metadata));
    const members = await db
      .select({ email: users.email })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.orgId, org.id));

    for (const m of members) {
      await enqueueEmail({
        template: 'activity-digest',
        to: m.email,
        data: { orgName: org.name, count: items.length, items: lines },
      });
      emails++;
    }
  }

  return { orgs: orgs.length, emails };
}
