'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Member, Org } from '@/lib/types';

export const orgsKey = ['orgs'] as const;

export function useOrgs() {
  return useQuery({
    queryKey: orgsKey,
    queryFn: () => api.get<{ orgs: Org[] }>('/orgs').then((r) => r.orgs),
  });
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slug?: string }) =>
      api.post<{ org: Org }>('/orgs', input).then((r) => r.org),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgsKey }),
  });
}

export function useMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ['members', orgId],
    enabled: !!orgId,
    queryFn: () => api.get<{ members: Member[] }>(`/orgs/${orgId}/members`).then((r) => r.members),
  });
}
