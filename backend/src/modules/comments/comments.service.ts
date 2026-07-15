import { asc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { comments, issues, users } from '../../db/schema';
import { notFound } from '../../lib/http-errors';
import { recordActivity } from '../../lib/activity';
import { enqueueEmbedding } from '../../queues/queues';
import type { CreateCommentInput } from './comments.schemas';

export async function listComments(issueId: string) {
  return db.query.comments.findMany({
    where: eq(comments.issueId, issueId),
    with: { author: { columns: { id: true, name: true, avatarUrl: true } } },
    orderBy: [asc(comments.createdAt)],
  });
}

export async function createComment(actorId: string, issueId: string, input: CreateCommentInput) {
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    with: { project: { columns: { orgId: true } } },
  });
  if (!issue) throw notFound('Issue not found');

  const result = await db.transaction(async (tx) => {
    const [comment] = await tx
      .insert(comments)
      .values({ issueId, authorId: actorId, body: input.body })
      .returning();
    if (!comment) throw new Error('Failed to create comment');

    await recordActivity(tx, {
      orgId: issue.project.orgId,
      actorId,
      entityType: 'comment',
      entityId: comment.id,
      action: 'comment.created',
      metadata: { issueId },
    });

    // Return with author info for immediate rendering.
    const author = await tx.query.users.findFirst({
      where: eq(users.id, actorId),
      columns: { id: true, name: true, avatarUrl: true },
    });
    return { ...comment, author };
  });

  // A new comment changes the issue's searchable text — re-index it.
  void enqueueEmbedding(issueId).catch(() => {});
  return result;
}
