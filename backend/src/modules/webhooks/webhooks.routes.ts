import { Router } from 'express';
import { requireRole } from '../../middleware/require-role';
import { createWebhookSchema, updateWebhookSchema, WEBHOOK_EVENTS } from './webhooks.schemas';
import {
  createWebhook,
  deleteWebhook,
  listDeliveries,
  listWebhooks,
  pingWebhook,
  updateWebhook,
} from './webhooks.service';

// Mounted at /orgs/:orgId/webhooks (mergeParams). Admin+ — webhooks send org
// data to external URLs, so managing them is privileged.
export const webhooksRouter = Router({ mergeParams: true });

const orgId = (req: { params: Record<string, unknown> }) => req.params.orgId as string;

// GET /events — the catalog of subscribable events (for the UI).
webhooksRouter.get('/events', requireRole('member'), (_req, res) => {
  res.json({ events: WEBHOOK_EVENTS });
});

webhooksRouter.get('/', requireRole('admin'), async (req, res) => {
  res.json({ webhooks: await listWebhooks(orgId(req)) });
});

webhooksRouter.post('/', requireRole('admin'), async (req, res) => {
  const input = createWebhookSchema.parse(req.body);
  res.status(201).json({ webhook: await createWebhook(orgId(req), input) });
});

webhooksRouter.patch('/:webhookId', requireRole('admin'), async (req, res) => {
  const input = updateWebhookSchema.parse(req.body);
  res.json({ webhook: await updateWebhook(orgId(req), req.params.webhookId as string, input) });
});

webhooksRouter.delete('/:webhookId', requireRole('admin'), async (req, res) => {
  await deleteWebhook(orgId(req), req.params.webhookId as string);
  res.status(204).end();
});

webhooksRouter.get('/:webhookId/deliveries', requireRole('admin'), async (req, res) => {
  res.json({ deliveries: await listDeliveries(orgId(req), req.params.webhookId as string) });
});

webhooksRouter.post('/:webhookId/ping', requireRole('admin'), async (req, res) => {
  await pingWebhook(orgId(req), req.params.webhookId as string);
  res.status(202).json({ status: 'queued' });
});
