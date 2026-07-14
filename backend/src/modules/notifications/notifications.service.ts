import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { notifications, users } from '../../db/schema';
import { env } from '../../config/env';
import { enqueueEmail } from '../../queues/queues';

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const [n] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    })
    .returning();
  return n;
}

export async function listNotifications(userId: string, limit = 20) {
  const items = await db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });
  const [unread] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { notifications: items, unread: unread?.n ?? 0 };
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function markRead(userId: string, id: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

/**
 * Notify a user they were assigned an issue: an in-app notification (immediate)
 * plus an async email. No-op when someone assigns an issue to themselves.
 */
export async function notifyIssueAssigned(params: {
  assigneeId: string;
  actorId: string;
  issueId: string;
  projectId: string;
  identifier: string;
  title: string;
}): Promise<void> {
  if (params.assigneeId === params.actorId) return;

  await createNotification({
    userId: params.assigneeId,
    type: 'issue_assigned',
    title: `${params.identifier}: ${params.title}`,
    body: 'You were assigned to an issue.',
    entityType: 'issue',
    entityId: params.issueId,
  });

  const assignee = await db.query.users.findFirst({
    where: eq(users.id, params.assigneeId),
    columns: { email: true },
  });
  if (assignee) {
    await enqueueEmail({
      template: 'issue-assigned',
      to: assignee.email,
      data: {
        identifier: params.identifier,
        title: params.title,
        url: `${env.APP_URL}/app/projects/${params.projectId}`,
      },
    });
  }
}
