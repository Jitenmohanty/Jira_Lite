import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../../middleware/require-role';
import { aiLimiter } from '../../middleware/rate-limit';
import { badRequest, notFound } from '../../lib/http-errors';
import { aiQueue, enqueueAiQuestion } from '../../queues/queues';
import { isAiEnabled } from './client';

// Mounted at /orgs/:orgId/ai (mergeParams for :orgId).
export const aiRouter = Router({ mergeParams: true });

const askSchema = z.object({
  question: z.string().trim().min(3, 'Question is too short').max(1000, 'Question is too long'),
});

// GET /orgs/:orgId/ai — feature availability, so the UI can hide the panel.
aiRouter.get('/', requireRole('member'), (_req, res) => {
  res.json({ enabled: isAiEnabled() });
});

// POST /orgs/:orgId/ai/ask — enqueue a question; returns a job id to poll.
aiRouter.post('/ask', requireRole('member'), aiLimiter, async (req, res) => {
  if (!isAiEnabled()) {
    return res
      .status(503)
      .json({ error: { code: 'AI_DISABLED', message: 'The AI assistant is not configured.' } });
  }
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid question');

  const orgId = req.params.orgId as string;
  const job = await enqueueAiQuestion({
    orgId,
    userId: req.user!.id,
    question: parsed.data.question,
  });
  res.status(202).json({ jobId: job.id });
});

// GET /orgs/:orgId/ai/ask/:jobId — poll for the answer.
aiRouter.get('/ask/:jobId', requireRole('member'), async (req, res) => {
  const job = await aiQueue.getJob(req.params.jobId as string);
  // Ownership: the job must belong to this org and this user.
  if (!job || job.data.orgId !== req.params.orgId || job.data.userId !== req.user!.id) {
    throw notFound('Question not found');
  }

  const state = await job.getState();
  if (state === 'completed') {
    return res.json({ status: 'completed', result: job.returnvalue });
  }
  if (state === 'failed') {
    return res.json({
      status: 'failed',
      error: 'The assistant could not answer that. Please try again.',
    });
  }
  // waiting / active / delayed / prioritized — still working. `delayed` after a
  // provider rate limit means we're waiting to auto-resume.
  res.json({ status: state === 'delayed' ? 'retrying' : 'working' });
});
