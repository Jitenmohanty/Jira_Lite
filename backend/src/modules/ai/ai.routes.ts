import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { requireRole } from '../../middleware/require-role';
import { aiLimiter } from '../../middleware/rate-limit';
import { notFound } from '../../lib/http-errors';
import { aiQueue, enqueueAiQuestion } from '../../queues/queues';
import { isAiEnabled } from './client';

// Mounted at /orgs/:orgId/ai (mergeParams for :orgId).
export const aiRouter = Router({ mergeParams: true });

const askSchema = z.object({
  question: z.string().trim().min(3, 'Question is too short').max(1000, 'Question is too long'),
});
type AskInput = z.infer<typeof askSchema>;

// 503 if the assistant isn't configured. Runs BEFORE the rate limiter so probing
// a disabled instance never consumes a user's AI budget.
const requireAiEnabled: RequestHandler = (_req, res, next) => {
  if (!isAiEnabled()) {
    res
      .status(503)
      .json({ error: { code: 'AI_DISABLED', message: 'The AI assistant is not configured.' } });
    return;
  }
  next();
};

// Validate the body up front: a ZodError becomes the standard 400 VALIDATION
// (with field details), consistent with every other endpoint. Also before the
// limiter, so malformed questions don't burn budget either.
const validateQuestion: RequestHandler = (req, _res, next) => {
  req.body = askSchema.parse(req.body);
  next();
};

// GET /orgs/:orgId/ai — feature availability, so the UI can hide the panel.
aiRouter.get('/', requireRole('member'), (_req, res) => {
  res.json({ enabled: isAiEnabled() });
});

// POST /orgs/:orgId/ai/ask — enqueue a question; returns a job id to poll.
aiRouter.post(
  '/ask',
  requireRole('member'),
  requireAiEnabled,
  validateQuestion,
  aiLimiter,
  async (req, res) => {
    const orgId = req.params.orgId as string;
    const job = await enqueueAiQuestion({
      orgId,
      userId: req.user!.id,
      question: (req.body as AskInput).question,
    });
    res.status(202).json({ jobId: job.id });
  },
);

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
