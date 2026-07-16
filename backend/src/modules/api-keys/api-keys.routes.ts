import { Router } from 'express';
import { requireRole } from '../../middleware/require-role';
import { unauthorized } from '../../lib/http-errors';
import { createApiKeySchema } from './api-keys.schemas';
import { createApiKey, listApiKeys, revokeApiKey } from './api-keys.service';

// Mounted at /orgs/:orgId/api-keys (mergeParams for :orgId). Admin+ only —
// keys grant programmatic access, so managing them is a privileged action.
export const apiKeysRouter = Router({ mergeParams: true });

// GET — list keys (metadata only; secrets are never returned).
apiKeysRouter.get('/', requireRole('admin'), async (req, res) => {
  res.json({ apiKeys: await listApiKeys(req.params.orgId as string) });
});

// POST — create a key; the raw secret is returned ONCE in this response.
apiKeysRouter.post('/', requireRole('admin'), async (req, res) => {
  if (!req.user) throw unauthorized();
  const input = createApiKeySchema.parse(req.body);
  const created = await createApiKey(req.params.orgId as string, req.user.id, input);
  res.status(201).json({ apiKey: created });
});

// DELETE — revoke a key.
apiKeysRouter.delete('/:keyId', requireRole('admin'), async (req, res) => {
  await revokeApiKey(req.params.orgId as string, req.params.keyId as string);
  res.status(204).end();
});
