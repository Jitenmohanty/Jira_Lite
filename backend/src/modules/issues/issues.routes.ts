import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../../middleware/require-role';
import { orgFromIssue, orgFromProject } from '../../lib/org-resolvers';
import { unauthorized } from '../../lib/http-errors';
import { createIssueSchema, listIssuesQuerySchema, updateIssueSchema } from './issues.schemas';
import {
  createIssue,
  deleteIssue,
  getIssue,
  listIssues,
  searchIssues,
  updateIssue,
} from './issues.service';

/** Org-scoped issue search: mounted at /orgs/:orgId/issues. */
export const orgIssuesRouter = Router({ mergeParams: true });

const searchQuerySchema = z.object({ q: z.string().trim().default('') });

orgIssuesRouter.get('/search', requireRole('member'), async (req, res) => {
  const { q } = searchQuerySchema.parse(req.query);
  if (q.length < 2) {
    res.json({ issues: [] });
    return;
  }
  const results = await searchIssues(req.params.orgId as string, q, 10);
  res.json({ issues: results });
});

/** Project-scoped list/create: mounted at /projects/:projectId/issues. */
export const projectIssuesRouter = Router({ mergeParams: true });

projectIssuesRouter.get('/', requireRole('member', orgFromProject), async (req, res) => {
  const q = listIssuesQuerySchema.parse(req.query);
  const result = await listIssues(req.params.projectId as string, q);
  res.json(result);
});

projectIssuesRouter.post('/', requireRole('member', orgFromProject), async (req, res) => {
  if (!req.user) throw unauthorized();
  const input = createIssueSchema.parse(req.body);
  const issue = await createIssue(req.user.id, req.params.projectId as string, input);
  res.status(201).json({ issue });
});

/** Single-issue read/update/delete: mounted at /issues. */
export const issuesRouter = Router();

issuesRouter.get('/:issueId', requireRole('member', orgFromIssue), async (req, res) => {
  const issue = await getIssue(req.params.issueId as string);
  res.json({ issue });
});

issuesRouter.patch('/:issueId', requireRole('member', orgFromIssue), async (req, res) => {
  if (!req.user) throw unauthorized();
  const input = updateIssueSchema.parse(req.body);
  const issue = await updateIssue(req.user.id, req.params.issueId as string, input);
  res.json({ issue });
});

issuesRouter.delete('/:issueId', requireRole('member', orgFromIssue), async (req, res) => {
  if (!req.user) throw unauthorized();
  await deleteIssue(req.user.id, req.params.issueId as string);
  res.status(204).send();
});
