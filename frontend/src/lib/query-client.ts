import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/** Creates a QueryClient with sane defaults for this app. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry auth/permission errors — they won't fix themselves.
          if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
