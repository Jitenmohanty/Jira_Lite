import { and, count, desc, eq, gte, notInArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  activity,
  issuePriorityEnum,
  issueStatusEnum,
  issues,
  projects,
  users,
  type IssuePriority,
  type IssueStatus,
} from '../../db/schema';

const STATUSES = issueStatusEnum.enumValues;
const PRIORITIES = issuePriorityEnum.enumValues;

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC YYYY-MM-DD keys for the last `n` days (oldest first). */
function lastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    days.push(new Date(today.getTime() - i * DAY_MS).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Aggregated analytics for an org across all its projects: status/priority
 * breakdowns, a 14-day created-vs-completed throughput series, open-issue load
 * per assignee, and headline totals.
 */
export async function getInsights(orgId: string) {
  const scoped = eq(projects.orgId, orgId);

  // Status & priority breakdowns.
  const statusRows = await db
    .select({ status: issues.status, n: count() })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(scoped)
    .groupBy(issues.status);
  const priorityRows = await db
    .select({ priority: issues.priority, n: count() })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(scoped)
    .groupBy(issues.priority);

  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    IssueStatus,
    number
  >;
  for (const r of statusRows) statusCounts[r.status] = r.n;
  const priorityCounts = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<
    IssuePriority,
    number
  >;
  for (const r of priorityRows) priorityCounts[r.priority] = r.n;

  // 14-day throughput. "Created" from issues; "completed" from the activity log
  // (status changed to done), both bucketed by UTC day.
  const since = new Date(Date.now() - 13 * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);
  const createdDay = sql<string>`to_char(${issues.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;
  const createdRows = await db
    .select({ day: createdDay, n: count() })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(and(scoped, gte(issues.createdAt, since)))
    .groupBy(createdDay);

  const completedDay = sql<string>`to_char(${activity.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;
  const completedRows = await db
    .select({ day: completedDay, n: count() })
    .from(activity)
    .where(
      and(
        eq(activity.orgId, orgId),
        eq(activity.action, 'issue.status_changed'),
        sql`${activity.metadata} ->> 'to' = 'done'`,
        gte(activity.createdAt, since),
      ),
    )
    .groupBy(completedDay);

  const createdByDay = new Map(createdRows.map((r) => [r.day, r.n]));
  const completedByDay = new Map(completedRows.map((r) => [r.day, r.n]));
  const throughput = lastNDays(14).map((day) => ({
    day,
    created: createdByDay.get(day) ?? 0,
    completed: completedByDay.get(day) ?? 0,
  }));

  // Open-issue load per assignee (excludes done/cancelled).
  const loadRows = await db
    .select({ userId: issues.assigneeId, name: users.name, n: count() })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .leftJoin(users, eq(issues.assigneeId, users.id))
    .where(and(scoped, notInArray(issues.status, ['done', 'cancelled'])))
    .groupBy(issues.assigneeId, users.name)
    .orderBy(desc(count()));
  const assigneeLoad = loadRows.map((r) => ({ name: r.name ?? 'Unassigned', count: r.n }));

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const [doneRecent] = await db
    .select({ n: count() })
    .from(activity)
    .where(
      and(
        eq(activity.orgId, orgId),
        eq(activity.action, 'issue.status_changed'),
        sql`${activity.metadata} ->> 'to' = 'done'`,
        gte(activity.createdAt, new Date(Date.now() - 7 * DAY_MS)),
      ),
    );

  return {
    totals: {
      total,
      open: total - statusCounts.done - statusCounts.cancelled,
      done: statusCounts.done,
      completedLast7Days: doneRecent?.n ?? 0,
    },
    statusCounts,
    priorityCounts,
    throughput,
    assigneeLoad,
  };
}
