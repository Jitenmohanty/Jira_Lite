import { test, expect } from '@playwright/test';
import { getSession, firstOrg, listMembers, csrfHeaders, USERS } from '../helpers/api';

/**
 * On-demand dummy-data generator (NOT part of the normal suite — it has its own
 * config, run with `npm run seed:dummy`). It bulk-creates a handful of projects
 * and a spread of issues across every status/priority/assignee, plus a few
 * comments, so the app looks realistically full for demos and manual testing.
 *
 * Volume is configurable via env (defaults ≈ 3 projects × 20 issues = 60):
 *   DUMMY_PROJECTS, DUMMY_ISSUES_PER_PROJECT
 *
 * Everything is created through the real API as the seeded owner, so it also
 * exercises the same code paths a user would.
 */

const PROJECT_COUNT = Number(process.env.DUMMY_PROJECTS ?? 3);
const ISSUES_PER_PROJECT = Number(process.env.DUMMY_ISSUES_PER_PROJECT ?? 20);

const STATUSES = ['backlog', 'todo', 'in_progress', 'done', 'cancelled'] as const;
const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;

const PROJECT_THEMES = [
  { name: 'Mobile App', key: 'MOB' },
  { name: 'Billing Platform', key: 'BILL' },
  { name: 'Marketing Site', key: 'MKT' },
  { name: 'Data Pipeline', key: 'DATA' },
  { name: 'Design System', key: 'DS' },
];

const TITLE_VERBS = [
  'Implement',
  'Fix',
  'Refactor',
  'Investigate',
  'Add',
  'Improve',
  'Remove',
  'Document',
  'Optimize',
  'Redesign',
];
const TITLE_SUBJECTS = [
  'the login flow',
  'the checkout page',
  'dark-mode tokens',
  'the search index',
  'webhook retries',
  'the onboarding wizard',
  'rate limiting',
  'the settings modal',
  'avatar uploads',
  'the activity feed',
  'keyboard shortcuts',
  'the export job',
  'pagination',
  'the notification bell',
  'error boundaries',
];
const COMMENT_BODIES = [
  'Taking a look at this now.',
  'Reproduced on staging — pushing a fix.',
  'Blocked on the API change, will revisit tomorrow.',
  'LGTM, nice work.',
  'Can we split this into two issues?',
  'Added a test to cover the edge case.',
];

// Run the async tasks produced by `make` in small concurrent batches so the
// generator finishes quickly without hammering the DB all at once.
async function inBatches<T>(count: number, size: number, make: (i: number) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  for (let start = 0; start < count; start += size) {
    const batch = Array.from({ length: Math.min(size, count - start) }, (_, k) => make(start + k));
    out.push(...(await Promise.all(batch)));
  }
  return out;
}

const BATCH_SIZE = 5;

test.describe('dummy data', () => {
  // Batched, but still a lot of round-trips to a cloud DB — allow ample time.
  test.setTimeout(Math.max(180_000, PROJECT_COUNT * ISSUES_PER_PROJECT * 2000));

  test('@seed generate dummy projects, issues and comments', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);
    const members = await listMembers(session, org.id);
    // Assignee cycle: unassigned + each member.
    const assigneeChoices: (string | null)[] = [null, ...members.map((m) => m.userId)];

    const stamp = `${Date.now()}`.slice(-4);
    let totalIssues = 0;
    let totalComments = 0;
    const createdProjects: { name: string; key: string; id: string }[] = [];

    for (let p = 0; p < PROJECT_COUNT; p++) {
      const theme = PROJECT_THEMES[p % PROJECT_THEMES.length];
      // Suffix the key so re-runs don't collide (keys are uppercase alnum, ≤10).
      const key = `${theme.key}${stamp}`.slice(0, 10);
      const projRes = await session.ctx.post(`/orgs/${org.id}/projects`, {
        headers: csrfHeaders(session),
        data: {
          name: `${theme.name} ${stamp}`,
          key,
          description: `Auto-generated dummy project for ${theme.name}.`,
        },
      });
      expect(projRes.status(), await projRes.text()).toBe(201);
      const { project } = await projRes.json();
      createdProjects.push({ name: project.name, key: project.key, id: project.id });

      // Create this project's issues in concurrent batches (the sequential
      // issue_number is still assigned safely server-side).
      const issues = await inBatches(ISSUES_PER_PROJECT, BATCH_SIZE, async (i) => {
        const verb = TITLE_VERBS[(p + i) % TITLE_VERBS.length];
        const subject = TITLE_SUBJECTS[(i * 3 + p) % TITLE_SUBJECTS.length];
        const status = STATUSES[i % STATUSES.length];
        const priority = PRIORITIES[(i * 2 + p) % PRIORITIES.length];
        const assigneeId = assigneeChoices[i % assigneeChoices.length];

        const res = await session.ctx.post(`/projects/${project.id}/issues`, {
          headers: csrfHeaders(session),
          data: {
            title: `${verb} ${subject}`,
            description: `Dummy issue #${i + 1} in ${project.name}.`,
            status,
            priority,
            assigneeId,
          },
        });
        expect(res.status(), await res.text()).toBe(201);
        return { index: i, issue: (await res.json()).issue as { id: string } };
      });
      totalIssues += issues.length;

      // Sprinkle 1–2 comments on roughly every third issue, batched too.
      const withComments = issues.filter((x) => x.index % 3 === 0);
      const commentTasks: { issueId: string; body: string }[] = [];
      for (const { index, issue } of withComments) {
        const commentCount = (index % 2) + 1;
        for (let c = 0; c < commentCount; c++) {
          commentTasks.push({ issueId: issue.id, body: COMMENT_BODIES[(index + c) % COMMENT_BODIES.length] });
        }
      }
      await inBatches(commentTasks.length, BATCH_SIZE, async (i) => {
        const { issueId, body } = commentTasks[i];
        const res = await session.ctx.post(`/issues/${issueId}/comments`, {
          headers: csrfHeaders(session),
          data: { body },
        });
        expect(res.status(), await res.text()).toBe(201);
        totalComments++;
      });
    }

    // eslint-disable-next-line no-console
    console.log(
      `\n✅ Dummy data created in org "${org.name}":\n` +
        createdProjects.map((p) => `   • ${p.key} — ${p.name}`).join('\n') +
        `\n   ${totalIssues} issues, ${totalComments} comments across ${createdProjects.length} projects.\n`,
    );

    expect(createdProjects.length).toBe(PROJECT_COUNT);
    expect(totalIssues).toBe(PROJECT_COUNT * ISSUES_PER_PROJECT);
  });
});
