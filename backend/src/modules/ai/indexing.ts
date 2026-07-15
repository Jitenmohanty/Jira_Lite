import { asc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { comments, issueEmbeddings, issues } from '../../db/schema';
import { contentHash, embed } from './embeddings';

/**
 * Builds the natural-language document that represents an issue for semantic
 * search: its identifier, title, status/priority, description, and comment
 * thread. Returns null if the issue no longer exists (e.g. it was deleted
 * between enqueue and processing).
 */
async function buildIssueDocument(issueId: string) {
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    with: {
      project: { columns: { key: true, orgId: true, name: true } },
      assignee: { columns: { name: true } },
    },
  });
  if (!issue) return null;

  const rows = await db
    .select({ body: comments.body })
    .from(comments)
    .where(eq(comments.issueId, issueId))
    .orderBy(asc(comments.createdAt));

  const identifier = `${issue.project.key}-${issue.issueNumber}`;
  const parts = [
    `${identifier}: ${issue.title}`,
    `Project: ${issue.project.name}`,
    `Status: ${issue.status}. Priority: ${issue.priority}.`,
    issue.assignee?.name ? `Assignee: ${issue.assignee.name}.` : 'Unassigned.',
    issue.description ?? '',
    ...rows.map((c) => `Comment: ${c.body}`),
  ];
  const content = parts.filter(Boolean).join('\n');
  return { orgId: issue.project.orgId, content };
}

/**
 * (Re)computes and upserts an issue's embedding. Skips the (relatively
 * expensive) embedding step when the source text is unchanged since the last
 * run, comparing SHA-256 hashes.
 *
 * @returns 'indexed' | 'skipped' | 'gone'
 */
export async function indexIssue(issueId: string): Promise<'indexed' | 'skipped' | 'gone'> {
  const doc = await buildIssueDocument(issueId);
  if (!doc) {
    // Issue deleted — its embedding row is removed by the FK cascade.
    return 'gone';
  }

  const hash = contentHash(doc.content);
  const existing = await db.query.issueEmbeddings.findFirst({
    where: eq(issueEmbeddings.issueId, issueId),
    columns: { contentHash: true },
  });
  if (existing?.contentHash === hash) return 'skipped';

  const vector = await embed(doc.content);
  await db
    .insert(issueEmbeddings)
    .values({
      issueId,
      orgId: doc.orgId,
      content: doc.content,
      contentHash: hash,
      embedding: vector,
    })
    .onConflictDoUpdate({
      target: issueEmbeddings.issueId,
      set: {
        orgId: doc.orgId,
        content: doc.content,
        contentHash: hash,
        embedding: vector,
        updatedAt: new Date(),
      },
    });

  return 'indexed';
}
