'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}
export interface CreatedApiKey extends ApiKey {
  key: string; // raw secret — present only in the create response
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}
export interface CreatedWebhook extends Webhook {
  secret: string; // present only in the create response
}
export interface WebhookDelivery {
  id: string;
  event: string;
  status: 'pending' | 'success' | 'failed';
  statusCode: number | null;
  attempts: number;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

/* ---------------------------------------------------------------- API keys */

export function useApiKeys(orgId: string | undefined) {
  return useQuery({
    queryKey: ['api-keys', orgId],
    enabled: !!orgId,
    queryFn: () => api.get<{ apiKeys: ApiKey[] }>(`/orgs/${orgId}/api-keys`).then((r) => r.apiKeys),
  });
}

export function useCreateApiKey(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) =>
      api.post<{ apiKey: CreatedApiKey }>(`/orgs/${orgId}/api-keys`, input).then((r) => r.apiKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys', orgId] }),
  });
}

export function useRevokeApiKey(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api.del(`/orgs/${orgId}/api-keys/${keyId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys', orgId] }),
  });
}

/* ---------------------------------------------------------------- webhooks */

export function useWebhookEvents(orgId: string | undefined) {
  return useQuery({
    queryKey: ['webhook-events', orgId],
    enabled: !!orgId,
    staleTime: Infinity,
    queryFn: () => api.get<{ events: string[] }>(`/orgs/${orgId}/webhooks/events`).then((r) => r.events),
  });
}

export function useWebhooks(orgId: string | undefined) {
  return useQuery({
    queryKey: ['webhooks', orgId],
    enabled: !!orgId,
    queryFn: () => api.get<{ webhooks: Webhook[] }>(`/orgs/${orgId}/webhooks`).then((r) => r.webhooks),
  });
}

export function useCreateWebhook(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { url: string; events: string[] }) =>
      api.post<{ webhook: CreatedWebhook }>(`/orgs/${orgId}/webhooks`, input).then((r) => r.webhook),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks', orgId] }),
  });
}

export function useDeleteWebhook(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/orgs/${orgId}/webhooks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks', orgId] }),
  });
}

export function usePingWebhook(orgId: string) {
  return useMutation({
    mutationFn: (id: string) => api.post(`/orgs/${orgId}/webhooks/${id}/ping`),
  });
}

export function useDeliveries(orgId: string | undefined, webhookId: string | null) {
  return useQuery({
    queryKey: ['deliveries', orgId, webhookId],
    enabled: !!orgId && !!webhookId,
    refetchInterval: 3000,
    queryFn: () =>
      api
        .get<{ deliveries: WebhookDelivery[] }>(`/orgs/${orgId}/webhooks/${webhookId}/deliveries`)
        .then((r) => r.deliveries),
  });
}
