import { and, count, desc, eq, ilike, isNull, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/client';
import { issues, memberships, projects } from '../../db/schema';
import { badRequest, notFound } from '../../lib/http-errors';
import { recordActivity } from '../../lib/activity';
import type { Executor } from '../../lib/activity';
import { emitIssueChanged } from '../../realtime/emit';
import { notifyIssueAssigned } from '../notifications/notifications.service';
import type { CreateIssueInput, ListIssuesQuery, UpdateIssueInput } from './issues.schemas';

/** Verify a user is a member of the org (used to validate assignees). */
async function assertMember(exec: Executor, orgId: string, userId: string) {
  const m = await exec
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
    .limit(1);
  if (m.length === 0) throw badRequest('Assignee must be a member of the organization');
}

const identifier = (key: string, num: number) => `${key}-${num}`;

/**
 * Creates an issue with a per-project sequential number that is correct under
 * concurrent inserts.
 *
 * Concurrency approach: inside a single transaction we bump the project's
 * `issue_counter` with `UPDATE ... SET issue_counter = issue_counter + 1
 * RETURNING`. That UPDATE takes a row-level lock on the project row for the life
 * of the transaction, so any concurrent create for the same project blocks until
 * we commit, then reads the next value. This guarantees a gap-free, unique
 * sequence per project without a global lock. The unique index on
 * (project_id, issue_number) is the final backstop.
 */
export async function createIssue(actorId: string, projectId: string, input: CreateIssueInput) {
  let orgId = '';
  const created = await db.transaction(async (tx) => {
    const [proj] = await tx
      .update(projects)
      .set({ issueCounter: sql`${projects.issueCounter} + 1` })
      .where(eq(projects.id, projectId))
      .returning({ issueCounter: projects.issueCounter, orgId: projects.orgId, key: projects.key });
    if (!proj) throw notFound('Project not found');
    orgId = proj.orgId;

    if (input.assigneeId) await assertMember(tx, proj.orgId, input.assigneeId);

    const [issue] = await tx
      .insert(issues)
      .values({
        projectId,
        issueNumber: proj.issueCounter,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'backlog',
        priority: input.priority ?? 'none',
        assigneeId: input.assigneeId ?? null,
        reporterId: actorId,
      })
      .returning();
    if (!issue) throw new Error('Failed to create issue');

    await recordActivity(tx, {
      orgId: proj.orgId,
      actorId,
      entityType: 'issue',
      entityId: issue.id,
      action: 'issue.created',
      metadata: { issueNumber: issue.issueNumber, title: issue.title },
    });

    return { ...issue, identifier: identifier(proj.key, issue.issueNumber) };
  });

  // Broadcast to org members viewing the board.
  emitIssueChanged(orgId, projectId, created.id);

  // Notify the assignee (in-app + email) after the transaction commits.
  if (created.assigneeId) {
    await notifyIssueAssigned({
      assigneeId: created.assigneeId,
      actorId,
      issueId: created.id,
      projectId,
      identifier: created.identifier,
      title: created.title,
    });
  }
  return created;
}

export async function listIssues(projectId: string, q: ListIssuesQuery) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { key: true },
  });
  if (!project) throw notFound('Project not found');

  const conditions: SQL[] = [eq(issues.projectId, projectId)];
  if (q.status) conditions.push(eq(issues.status, q.status));
  if (q.priority) conditions.push(eq(issues.priority, q.priority));
  if (q.assignee === 'none') conditions.push(isNull(issues.assigneeId));
  else if (q.assignee) conditions.push(eq(issues.assigneeId, q.assignee));
  const where = and(...conditions);

  const rows = await db.query.issues.findMany({
    where,
    with: {
      assignee: { columns: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: [desc(issues.createdAt)],
    limit: q.limit,
    offset: q.offset,
  });

  const [totalRow] = await db.select({ n: count() }).from(issues).where(where);
  const total = totalRow?.n ?? 0;

  return {
    issues: rows.map((r) => ({ ...r, identifier: identifier(project.key, r.issueNumber) })),
    pagination: { limit: q.limit, offset: q.offset, total },
  };
}

/** Org-wide issue search by title (used by the command palette). */
export async function searchIssues(orgId: string, q: string, limit = 10) {
  const rows = await db
    .select({
      id: issues.id,
      issueNumber: issues.issueNumber,
      title: issues.title,
      projectId: issues.projectId,
      key: projects.key,
    })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(and(eq(projects.orgId, orgId), ilike(issues.title, `%${q}%`)))
    .orderBy(desc(issues.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    identifier: identifier(r.key, r.issueNumber),
    title: r.title,
    projectId: r.projectId,
  }));
}

export async function getIssue(issueId: string) {
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    with: {
      project: { columns: { id: true, key: true, name: true, orgId: true } },
      assignee: { columns: { id: true, name: true, avatarUrl: true } },
      reporter: { columns: { id: true, name: true, avatarUrl: true } },
    },
  });
  if (!issue) throw notFound('Issue not found');
  return { ...issue, identifier: identifier(issue.project.key, issue.issueNumber) };
}

export async function updateIssue(actorId: string, issueId: string, input: UpdateIssueInput) {
  const current = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    with: { project: { columns: { orgId: true, key: true } } },
  });
  if (!current) throw notFound('Issue not found');

  if (input.assigneeId) await assertMember(db, current.project.orgId, input.assigneeId);

  const updated = await db.transaction(async (tx) => {
    const [issue] = await tx
      .update(issues)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(issues.id, issueId))
      .returning();
    if (!issue) throw notFound('Issue not found');

    // Record a focused activity entry; status changes get from/to metadata.
    const metadata: Record<string, unknown> = { changed: Object.keys(input) };
    if (input.status && input.status !== current.status) {
      metadata.from = current.status;
      metadata.to = input.status;
    }
    await recordActivity(tx, {
      orgId: current.project.orgId,
      actorId,
      entityType: 'issue',
      entityId: issue.id,
      action: input.status && input.status !== current.status ? 'issue.status_changed' : 'issue.updated',
      metadata,
    });

    return { ...issue, identifier: identifier(current.project.key, issue.issueNumber) };
  });

  emitIssueChanged(current.project.orgId, current.projectId, updated.id);

  // Notify on a genuine reassignment to a different person.
  if (updated.assigneeId && updated.assigneeId !== current.assigneeId) {
    await notifyIssueAssigned({
      assigneeId: updated.assigneeId,
      actorId,
      issueId: updated.id,
      projectId: current.projectId,
      identifier: updated.identifier,
      title: updated.title,
    });
  }
  return updated;
}

export async function deleteIssue(actorId: string, issueId: string) {
  const current = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    with: { project: { columns: { orgId: true, key: true } } },
  });
  if (!current) throw notFound('Issue not found');

  await db.transaction(async (tx) => {
    await tx.delete(issues).where(eq(issues.id, issueId));
    await recordActivity(tx, {
      orgId: current.project.orgId,
      actorId,
      entityType: 'issue',
      entityId: issueId,
      action: 'issue.deleted',
      metadata: { identifier: identifier(current.project.key, current.issueNumber), title: current.title },
    });
  });

  emitIssueChanged(current.project.orgId, current.projectId, issueId);
}
