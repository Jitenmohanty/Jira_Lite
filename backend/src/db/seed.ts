import { sql } from 'drizzle-orm';
import { db, pool } from './client';
import { hashPassword } from '../lib/password';
import {
  activity,
  comments,
  issues,
  memberships,
  organizations,
  projects,
  users,
  type IssuePriority,
  type IssueStatus,
} from './schema';

/**
 * Seeds a realistic starter dataset: one org, three users (owner/admin/member),
 * one project, and ~15 issues across every status. Idempotent — it truncates
 * first so re-running yields a clean, known state.
 *
 * Demo credentials (all password `password123`):
 *   owner@tracer.dev · admin@tracer.dev · member@tracer.dev
 */
async function main() {
  console.log('🌱 Seeding database...');

  await db.execute(
    sql`TRUNCATE TABLE ${activity}, ${comments}, ${issues}, ${projects}, ${memberships}, ${organizations}, ${users} RESTART IDENTITY CASCADE`,
  );

  const passwordHash = await hashPassword('password123');

  const [owner, admin, member] = await db
    .insert(users)
    .values([
      { email: 'owner@tracer.dev', name: 'Olivia Owner', passwordHash },
      { email: 'admin@tracer.dev', name: 'Adam Admin', passwordHash },
      { email: 'member@tracer.dev', name: 'Mia Member', passwordHash },
    ])
    .returning();

  if (!owner || !admin || !member) throw new Error('Failed to seed users');

  const [org] = await db
    .insert(organizations)
    .values({ name: 'Tracer', slug: 'tracer' })
    .returning();
  if (!org) throw new Error('Failed to seed organization');

  await db.insert(memberships).values([
    { userId: owner.id, orgId: org.id, role: 'owner' },
    { userId: admin.id, orgId: org.id, role: 'admin' },
    { userId: member.id, orgId: org.id, role: 'member' },
  ]);

  const [project] = await db
    .insert(projects)
    .values({
      orgId: org.id,
      name: 'Tracer Core',
      key: 'TRC',
      description: 'Core product work for the Tracer issue tracker.',
    })
    .returning();
  if (!project) throw new Error('Failed to seed project');

  // 15 issues spread across statuses/priorities, some assigned.
  const memberIds = [owner.id, admin.id, member.id];
  const statuses: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled'];
  const priorities: IssuePriority[] = ['none', 'low', 'medium', 'high', 'urgent'];
  const titles = [
    'Set up drag-and-drop on the board',
    'Persist column order per user',
    'Add keyboard shortcut to create an issue',
    'Fix flicker on optimistic status change',
    'Empty state for projects with no issues',
    'Avatar fallback with initials',
    'Debounce the issue search input',
    'Paginate the activity feed',
    'Role-gate the members settings page',
    'Handle 401 by redirecting to login',
    'Add priority icons to issue cards',
    'Inline-edit issue title',
    'Comment thread realtime-ish refresh',
    'Dark/light theme toggle',
    'Lock CORS to the frontend origin',
  ];

  const issueRows = titles.map((title, i) => ({
    projectId: project.id,
    issueNumber: i + 1,
    title,
    description: i % 3 === 0 ? `Details and acceptance criteria for: ${title}.` : null,
    status: statuses[i % statuses.length]!,
    priority: priorities[i % priorities.length]!,
    assigneeId: i % 4 === 0 ? null : memberIds[i % memberIds.length]!,
    reporterId: memberIds[(i + 1) % memberIds.length]!,
  }));

  const insertedIssues = await db.insert(issues).values(issueRows).returning();

  // Keep the project counter in sync with the highest seeded issue number.
  await db.update(projects).set({ issueCounter: issueRows.length });

  // A couple of comments on the first issue.
  const firstIssue = insertedIssues[0]!;
  await db.insert(comments).values([
    { issueId: firstIssue.id, authorId: admin.id, body: 'I can pick this up today.' },
    { issueId: firstIssue.id, authorId: owner.id, body: 'Great — let’s aim for a smooth 60fps drag.' },
  ]);

  // Seed a few activity rows so the feed is not empty.
  await db.insert(activity).values(
    insertedIssues.slice(0, 5).map((iss) => ({
      orgId: org.id,
      actorId: iss.reporterId,
      entityType: 'issue',
      entityId: iss.id,
      action: 'issue.created',
      metadata: { issueNumber: iss.issueNumber, title: iss.title },
    })),
  );

  console.log(
    `✅ Seeded: 1 org, 3 users, 1 project (TRC), ${insertedIssues.length} issues, 2 comments, 5 activity rows.`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
