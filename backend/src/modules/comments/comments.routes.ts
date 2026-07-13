import { Router } from 'express';
import { requireRole } from '../../middleware/require-role';
import { orgFromIssue } from '../../lib/org-resolvers';
import { unauthorized } from '../../lib/http-errors';
import { createCommentSchema } from './comments.schemas';
import { createComment, listComments } from './comments.service';

// Mounted at /issues/:issueId/comments (mergeParams for :issueId).
export const commentsRouter = Router({ mergeParams: true });

commentsRouter.get('/', requireRole('member', orgFromIssue), async (req, res) => {
  const comments = await listComments(req.params.issueId as string);
  res.json({ comments });
});

commentsRouter.post('/', requireRole('member', orgFromIssue), async (req, res) => {
  if (!req.user) throw unauthorized();
  const input = createCommentSchema.parse(req.body);
  const comment = await createComment(req.user.id, req.params.issueId as string, input);
  res.status(201).json({ comment });
});
