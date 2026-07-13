import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db, pool } from '../../db/client';
import { issues, memberships, organizations, projects, users } from '../../db/schema';
import { createIssue, listIssues, updateIssue } from './issues.service';

/**
 * Integration tests that exercise the real Postgres. They create an isolated
 * org/project/user and tear it down afterward, so they don't touch seed data.
 */
let orgId: string;
let projectId: string;
let userId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: `itest+${Date.now()}@tracer.dev`, name: 'ITest', passwordHash: 'x' })
    .returning();
  userId = user!.id;

  const [org] = await db
    .insert(organizations)
    .values({ name: 'ITest Org', slug: `itest-${Date.now()}` })
    .returning();
  orgId = org!.id;

  await db.insert(memberships).values({ userId, orgId, role: 'owner' });

  const [project] = await db
    .insert(projects)
    .values({ orgId, name: 'ITest Project', key: 'IT' })
    .returning();
  projectId = project!.id;
});

afterAll(async () => {
  // Cascades remove memberships, projects, issues.
  await db.delete(organizations).where(eq(organizations.id, orgId));
  await db.delete(users).where(eq(users.id, userId));
  await pool.end();
});

describe('createIssue', () => {
  it('assigns identifier from project key and sequential number', async () => {
    const issue = await createIssue(userId, projectId, { title: 'First issue' });
    expect(issue.issueNumber).toBe(1);
    expect(issue.identifier).toBe('IT-1');
    expect(issue.status).toBe('backlog');
    expect(issue.reporterId).toBe(userId);
  });

  it('rejects an assignee who is not a member of the org', async () => {
    const [outsider] = await db
      .insert(users)
      .values({ email: `outsider+${Date.now()}@tracer.dev`, name: 'Out', passwordHash: 'x' })
      .returning();
    await expect(
      createIssue(userId, projectId, { title: 'bad assignee', assigneeId: outsider!.id }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await db.delete(users).where(eq(users.id, outsider!.id));
  });
});

describe('issue_number concurrency', () => {
  it('produces a unique, gap-free sequence under concurrent inserts', async () => {
    // Fresh project so numbering starts clean.
    const [p] = await db
      .insert(projects)
      .values({ orgId, name: 'Concurrency', key: 'CON' })
      .returning();
    const pid = p!.id;

    const N = 30;
    const created = await Promise.all(
      Array.from({ length: N }, (_, i) => createIssue(userId, pid, { title: `concurrent ${i}` })),
    );

    const numbers = created.map((c) => c.issueNumber).sort((a, b) => a - b);
    // Exactly 1..N with no duplicates or gaps.
    expect(numbers).toEqual(Array.from({ length: N }, (_, i) => i + 1));
    expect(new Set(numbers).size).toBe(N);

    // The persisted counter matches the last number handed out.
    const project = await db.query.projects.findFirst({ where: eq(projects.id, pid) });
    expect(project!.issueCounter).toBe(N);

    // And the DB actually holds N distinct rows.
    const rows = await db.select().from(issues).where(eq(issues.projectId, pid));
    expect(rows.length).toBe(N);
  });
});

describe('listIssues', () => {
  it('filters by status and paginates', async () => {
    const [p] = await db
      .insert(projects)
      .values({ orgId, name: 'Filters', key: 'FIL' })
      .returning();
    const pid = p!.id;

    await createIssue(userId, pid, { title: 'a', status: 'done' });
    await createIssue(userId, pid, { title: 'b', status: 'done' });
    await createIssue(userId, pid, { title: 'c', status: 'todo' });

    const done = await listIssues(pid, { status: 'done', limit: 50, offset: 0 });
    expect(done.pagination.total).toBe(2);
    expect(done.issues.every((i) => i.status === 'done')).toBe(true);

    const firstPage = await listIssues(pid, { limit: 2, offset: 0 });
    expect(firstPage.issues.length).toBe(2);
    expect(firstPage.pagination.total).toBe(3);
  });
});

describe('updateIssue', () => {
  it('records a status change and bumps updatedAt', async () => {
    const created = await createIssue(userId, projectId, { title: 'to update' });
    const before = created.updatedAt.getTime();
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateIssue(userId, created.id, { status: 'in_progress' });
    expect(updated.status).toBe('in_progress');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);

    // membership row exists for the actor (sanity: RBAC data intact).
    const m = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)),
    });
    expect(m?.role).toBe('owner');
  });
});
