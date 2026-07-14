'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Public auth feature flags (e.g. whether Google sign-in is enabled). */
export function useAuthConfig() {
  return useQuery({
    queryKey: ['auth-config'],
    queryFn: () => api.get<{ google: boolean }>('/auth/config'),
    staleTime: Infinity,
  });
}
