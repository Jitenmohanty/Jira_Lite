import { Router } from 'express';
import { requireRole } from '../../middleware/require-role';
import { getInsights } from './insights.service';

// Mounted at /orgs/:orgId/insights (mergeParams for :orgId).
export const insightsRouter = Router({ mergeParams: true });

// GET /orgs/:orgId/insights — aggregated analytics (member+).
insightsRouter.get('/', requireRole('member'), async (req, res) => {
  res.json(await getInsights(req.params.orgId as string));
});
