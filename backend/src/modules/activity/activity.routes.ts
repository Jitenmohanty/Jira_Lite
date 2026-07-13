import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../../middleware/require-role';
import { listActivity } from './activity.service';

// Mounted at /orgs/:orgId/activity (mergeParams for :orgId).
export const activityRouter = Router({ mergeParams: true });

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /orgs/:orgId/activity — org activity feed (member+).
activityRouter.get('/', requireRole('member'), async (req, res) => {
  const { limit, offset } = querySchema.parse(req.query);
  const items = await listActivity(req.params.orgId as string, limit, offset);
  res.json({ activity: items });
});
