'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Notification } from '@/lib/types';

const key = ['notifications'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: key,
    queryFn: () => api.get<{ notifications: Notification[]; unread: number }>('/notifications'),
    refetchInterval: 30_000, // light polling keeps the bell fresh
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
