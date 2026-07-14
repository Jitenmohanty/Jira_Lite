'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Live updates over Socket.IO. Authenticates with the same cookie as the REST
 * API (withCredentials). On server events it invalidates the relevant TanStack
 * Query caches, so open boards and the notification bell update in real time.
 */
export function useRealtime(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const socket: Socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('issue:changed', ({ projectId, issueId }: { projectId: string; issueId?: string }) => {
      qc.invalidateQueries({ queryKey: ['issues', projectId] });
      if (issueId) qc.invalidateQueries({ queryKey: ['issue', issueId] });
    });

    socket.on('notification:new', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled, qc]);
}
