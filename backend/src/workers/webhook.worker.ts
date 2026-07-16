import { UnrecoverableError, Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { webhookDeliveries, webhooks } from '../db/schema';
import { bullConnection } from '../queues/connection';
import { QUEUE, type WebhookJobData } from '../queues/queues';
import { signWebhook } from '../lib/webhook-signature';
import { assertPublicUrl, SsrfError } from '../lib/ssrf';

const TIMEOUT_MS = 10_000;

/**
 * Delivers webhook payloads with an HMAC-SHA256 signature. BullMQ retries with
 * exponential backoff (see the queue config); each attempt updates the delivery
 * row. The SSRF guard runs again here — not just at creation — to defeat DNS
 * rebinding (a host that resolved public at creation but now points inward).
 */
export function startWebhookWorker(): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>(
    QUEUE.webhook,
    async (job) => {
      const delivery = await db.query.webhookDeliveries.findFirst({
        where: eq(webhookDeliveries.id, job.data.deliveryId),
      });
      if (!delivery) throw new UnrecoverableError('Delivery row missing');

      const webhook = await db.query.webhooks.findFirst({
        where: eq(webhooks.id, delivery.webhookId),
      });
      // Webhook deleted/deactivated since enqueue → stop trying.
      if (!webhook || !webhook.active) {
        await markFailed(delivery.id, job.attemptsMade + 1, null, 'Webhook removed or inactive');
        throw new UnrecoverableError('Webhook removed or inactive');
      }

      // Re-validate the destination at delivery time (DNS-rebinding defense).
      try {
        await assertPublicUrl(webhook.url);
      } catch (err) {
        if (err instanceof SsrfError) {
          await markFailed(delivery.id, job.attemptsMade + 1, null, `Blocked: ${err.message}`);
          throw new UnrecoverableError(`SSRF guard: ${err.message}`);
        }
        throw err;
      }

      const body = JSON.stringify(delivery.payload);
      const ts = Math.floor(Date.now() / 1000).toString();
      const signature = signWebhook(webhook.secret, ts, body);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let statusCode: number;
      try {
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Tracer-Webhooks/1.0',
            'X-Tracer-Event': delivery.event,
            'X-Tracer-Delivery': delivery.id,
            'X-Tracer-Timestamp': ts,
            'X-Tracer-Signature': signature,
          },
          body,
          signal: controller.signal,
          redirect: 'manual', // don't follow redirects (could bypass the SSRF check)
        });
        statusCode = res.status;
      } finally {
        clearTimeout(timer);
      }

      const attempt = job.attemptsMade + 1;
      if (statusCode >= 200 && statusCode < 300) {
        await db
          .update(webhookDeliveries)
          .set({ status: 'success', statusCode, attempts: attempt, deliveredAt: new Date(), error: null })
          .where(eq(webhookDeliveries.id, delivery.id));
        return { statusCode };
      }
      // Non-2xx → record and throw so BullMQ retries (until attempts exhausted).
      await markFailed(delivery.id, attempt, statusCode, `HTTP ${statusCode}`);
      throw new Error(`Webhook responded ${statusCode}`);
    },
    { connection: bullConnection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    // On the final attempt, ensure the row reflects terminal failure.
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void markFailed(job.data.deliveryId, job.attemptsMade, null, err.message).catch(() => {});
    }
  });

  return worker;
}

async function markFailed(
  deliveryId: string,
  attempts: number,
  statusCode: number | null,
  error: string,
) {
  await db
    .update(webhookDeliveries)
    .set({ status: 'failed', statusCode, attempts, error })
    .where(eq(webhookDeliveries.id, deliveryId));
}
