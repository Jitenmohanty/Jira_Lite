import { createHmac, randomBytes } from 'node:crypto';

/**
 * Webhook payload signing. Each delivery carries an HMAC-SHA256 of the exact
 * request body, keyed by the webhook's secret, so receivers can verify the
 * payload is authentic and untampered. The signed value includes a timestamp
 * to let receivers reject replays.
 */

export function generateWebhookSecret(): string {
  return 'whsec_' + randomBytes(24).toString('base64url');
}

/** `sha256=<hex>` over `<timestamp>.<body>` — the value receivers verify. */
export function signWebhook(secret: string, timestamp: string, body: string): string {
  const mac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `sha256=${mac}`;
}
