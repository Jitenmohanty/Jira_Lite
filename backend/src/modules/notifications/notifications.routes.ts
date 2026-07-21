import { Router } from 'express';
import { z } from 'zod';
import { unauthorized } from '../../lib/http-errors';
import { listNotifications, markAllRead, markRead } from './notifications.service';

// requireAuth is applied at the mount point in app.ts.
export const notificationsRouter = Router();

const idParamSchema = z.object({ id: z.string().uuid() });

// GET /notifications — recent notifications + unread count for the caller.
notificationsRouter.get('/', async (req, res) => {
  if (!req.user) throw unauthorized();
  res.json(await listNotifications(req.user.id));
});

// POST /notifications/read-all — mark all as read.
notificationsRouter.post('/read-all', async (req, res) => {
  if (!req.user) throw unauthorized();
  await markAllRead(req.user.id);
  res.json({ ok: true });
});

// PATCH /notifications/:id/read — mark one as read.
notificationsRouter.patch('/:id/read', async (req, res) => {
  if (!req.user) throw unauthorized();
  const { id } = idParamSchema.parse(req.params);
  await markRead(req.user.id, id);
  res.json({ ok: true });
});
