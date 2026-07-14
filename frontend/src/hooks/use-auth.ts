'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { User } from '@/lib/types';

export const meKey = ['me'] as const;

/** Current user, or null when unauthenticated (401 is a normal signed-out state). */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async () => {
      try {
        const { user } = await api.get<{ user: User }>('/auth/me');
        return user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ user: User }>('/auth/login', input),
    onSuccess: ({ user }) => qc.setQueryData(meKey, user),
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; name: string; password: string }) =>
      api.post<{ user: User }>('/auth/signup', input),
    onSuccess: ({ user }) => qc.setQueryData(meKey, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      qc.setQueryData(meKey, null);
      qc.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.post('/auth/forgot-password', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      api.post('/auth/reset-password', input),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => api.post('/auth/verify-email', { token }),
  });
}

export function useResendVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/verify-email/request'),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKey }),
  });
}
