import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { webhookDeliveries, webhooks } from '../../db/schema';
import { badRequest, notFound } from '../../lib/http-errors';
import { generateWebhookSecret } from '../../lib/webhook-signature';
import { assertPublicUrl, SsrfError } from '../../lib/ssrf';
import { enqueueWebhookDelivery } from '../../queues/queues';
import { logger } from '../../lib/logger';
import type { CreateWebhookInput, UpdateWebhookInput, WebhookEvent } from './webhooks.schemas';

function toPublic(w: typeof webhooks.$inferSelect) {
  return {
    id: w.id,
    url: w.url,
    events: w.events,
    active: w.active,
    createdAt: w.createdAt,
  };
}

/** Validate the URL is safe to fetch (SSRF guard), translating to a 400. */
async function assertSafeUrl(url: string) {
  try {
    await assertPublicUrl(url);
  } catch (err) {
    if (err instanceof SsrfError) throw badRequest(err.message);
    throw err;
  }
}

export async function createWebhook(orgId: string, input: CreateWebhookInput) {
  await assertSafeUrl(input.url);
  const secret = generateWebhookSecret();
  const [wh] = await db
    .insert(webhooks)
    .values({ orgId, url: input.url, secret, events: input.events })
    .returning();
  if (!wh) throw new Error('Failed to create webhook');
  // Secret returned once so the user can configure their receiver.
  return { ...toPublic(wh), secret };
}

export async function listWebhooks(orgId: string) {
  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.orgId, orgId))
    .orderBy(desc(webhooks.createdAt));
  return rows.map(toPublic);
}

async function getOwned(orgId: string, webhookId: string) {
  const wh = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)),
  });
  if (!wh) throw notFound('Webhook not found');
  return wh;
}

export async function updateWebhook(orgId: string, webhookId: string, input: UpdateWebhookInput) {
  await getOwned(orgId, webhookId);
  if (input.url) await assertSafeUrl(input.url);
  const [updated] = await db
    .update(webhooks)
    .set(input)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)))
    .returning();
  return toPublic(updated!);
}

export async function deleteWebhook(orgId: string, webhookId: string) {
  const [deleted] = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)))
    .returning({ id: webhooks.id });
  if (!deleted) throw notFound('Webhook not found');
}

export async function listDeliveries(orgId: string, webhookId: string, limit = 20) {
  await getOwned(orgId, webhookId);
  const rows = await db
    .select({
      id: webhookDeliveries.id,
      event: webhookDeliveries.event,
      status: webhookDeliveries.status,
      statusCode: webhookDeliveries.statusCode,
      attempts: webhookDeliveries.attempts,
      error: webhookDeliveries.error,
      createdAt: webhookDeliveries.createdAt,
      deliveredAt: webhookDeliveries.deliveredAt,
    })
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);
  return rows;
}

/** Queue a single delivery for one webhook (creates the log row + job). */
async function queueDelivery(webhookId: string, event: string, payload: Record<string, unknown>) {
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({ webhookId, event, payload, status: 'pending' })
    .returning({ id: webhookDeliveries.id });
  if (delivery) await enqueueWebhookDelivery(delivery.id);
}

/**
 * Fan an event out to every active webhook in the org that subscribes to it.
 * Fire-and-forget from callers (issue/comment services): failures here must
 * never break the originating request.
 */
export async function dispatchWebhookEvent(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const hooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.orgId, orgId), eq(webhooks.active, true)));

  const payload = { event, timestamp: new Date().toISOString(), data };
  await Promise.all(
    hooks
      .filter((h) => h.events.includes(event))
      .map((h) => queueDelivery(h.id, event, payload).catch((err) =>
        logger.warn({ err: (err as Error).message, webhookId: h.id }, 'webhook dispatch failed'),
      )),
  );
}

/** Send a synthetic test event to one webhook (the "ping" button). */
export async function pingWebhook(orgId: string, webhookId: string) {
  const wh = await getOwned(orgId, webhookId);
  await queueDelivery(wh.id, 'ping', {
    event: 'ping',
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test delivery from Tracer.' },
  });
}
