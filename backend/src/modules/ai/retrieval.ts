import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { comments, issues, projects } from '../../db/schema';
import { embed, toVectorLiteral } from './embeddings';

export interface SearchHit {
  issueId: string;
  projectId: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  snippet: string;
}

/**
 * Semantic search over an org's issues. **Tenant isolation is enforced here in
 * SQL** (`e.org_id = orgId`) — the caller passes the org id resolved from the
 * authenticated membership, never from model output. Ordered by cosine
 * distance against the query embedding using the HNSW index.
 */
export async function semanticSearch(
  orgId: string,
  query: string,
  k = 8,
): Promise<SearchHit[]> {
  const lit = toVectorLiteral(await embed(query));
  const result = await db.execute(sql`
    SELECT
      e.issue_id                              AS issue_id,
      i.project_id                            AS project_id,
      p.key || '-' || i.issue_number          AS identifier,
      i.title                                 AS title,
      i.status                                AS status,
      i.priority                              AS priority,
      COALESCE(u.name, 'Unassigned')          AS assignee,
      left(e.content, 240)                    AS snippet
    FROM issue_embeddings e
    JOIN issues i   ON i.id = e.issue_id
    JOIN projects p ON p.id = i.project_id
    LEFT JOIN users u ON u.id = i.assignee_id
    WHERE e.org_id = ${orgId}
    ORDER BY e.embedding <=> ${lit}::vector ASC
    LIMIT ${k}
  `);

  const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
  return rows.map((r) => ({
    issueId: String(r.issue_id),
    projectId: String(r.project_id),
    identifier: String(r.identifier),
    title: String(r.title),
    status: String(r.status),
    priority: String(r.priority),
    assignee: String(r.assignee),
    snippet: String(r.snippet ?? '').replace(/\s+/g, ' ').trim(),
  }));
}

/**
 * Full detail for one issue by its identifier (e.g. "TRC-14"), **scoped to the
 * org**. Returns null if the identifier is malformed or the issue isn't in this
 * org — so the agent can never read another tenant's data by guessing an id.
 */
export async function getIssueByIdentifier(orgId: string, identifier: string) {
  const match = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/.exec(identifier.trim());
  if (!match) return null;
  const key = match[1]!.toUpperCase();
  const number = Number(match[2]);

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.orgId, orgId), sql`upper(${projects.key}) = ${key}`),
    columns: { id: true, key: true, name: true },
  });
  if (!project) return null;

  const issue = await db.query.issues.findFirst({
    where: and(eq(issues.projectId, project.id), eq(issues.issueNumber, number)),
    with: {
      assignee: { columns: { name: true } },
      reporter: { columns: { name: true } },
    },
  });
  if (!issue) return null;

  const thread = await db
    .select({ body: comments.body })
    .from(comments)
    .where(eq(comments.issueId, issue.id))
    .orderBy(asc(comments.createdAt));

  return {
    identifier: `${project.key}-${issue.issueNumber}`,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    project: project.name,
    assignee: issue.assignee?.name ?? 'Unassigned',
    reporter: issue.reporter?.name ?? 'Unknown',
    description: issue.description ?? '',
    createdAt: issue.createdAt,
    comments: thread.map((c) => c.body),
  };
}
