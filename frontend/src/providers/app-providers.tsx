'use client';

import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';
import { ToastProvider } from '@/components/ui/toast';

export function AppProviders({ children }: { children: ReactNode }) {
  // One client per browser session (stable across re-renders).
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
