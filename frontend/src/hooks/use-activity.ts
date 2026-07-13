'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Activity } from '@/lib/types';

export function useActivity(orgId: string | undefined) {
  return useQuery({
    queryKey: ['activity', orgId],
    enabled: !!orgId,
    queryFn: () =>
      api.get<{ activity: Activity[] }>(`/orgs/${orgId}/activity?limit=100`).then((r) => r.activity),
  });
}
