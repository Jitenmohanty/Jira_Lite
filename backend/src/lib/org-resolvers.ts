import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { issues, projects } from '../db/schema';
import type { OrgResolver } from '../middleware/require-role';

/** requireRole resolver: derive org from `:projectId` in the route. */
export const orgFromProject: OrgResolver = async (req) => {
  const projectId = req.params.projectId;
  if (typeof projectId !== 'string') return undefined;
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { orgId: true },
  });
  return project?.orgId;
};

/** requireRole resolver: derive org from `:issueId` -> project -> org. */
export const orgFromIssue: OrgResolver = async (req) => {
  const issueId = req.params.issueId;
  if (typeof issueId !== 'string') return undefined;
  const row = await db
    .select({ orgId: projects.orgId })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(eq(issues.id, issueId))
    .limit(1);
  return row[0]?.orgId;
};
