import { z } from 'zod';

/** The events a webhook may subscribe to. */
export const WEBHOOK_EVENTS = [
  'issue.created',
  'issue.updated',
  'issue.status_changed',
  'issue.deleted',
  'comment.created',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL').max(2000),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, 'Subscribe to at least one event')
    .default([...WEBHOOK_EVENTS]),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().max(2000).optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
  active: z.boolean().optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
