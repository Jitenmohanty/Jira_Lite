'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Insights } from '@/lib/types';

export function useInsights(orgId: string | undefined) {
  return useQuery({
    queryKey: ['insights', orgId],
    enabled: !!orgId,
    queryFn: () => api.get<Insights>(`/orgs/${orgId}/insights`),
  });
}
