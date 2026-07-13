'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Comment, IssueDetail } from '@/lib/types';

export function useIssue(issueId: string | null) {
  return useQuery({
    queryKey: ['issue', issueId],
    enabled: !!issueId,
    queryFn: () => api.get<{ issue: IssueDetail }>(`/issues/${issueId}`).then((r) => r.issue),
  });
}

export function useComments(issueId: string | null) {
  return useQuery({
    queryKey: ['comments', issueId],
    enabled: !!issueId,
    queryFn: () =>
      api.get<{ comments: Comment[] }>(`/issues/${issueId}/comments`).then((r) => r.comments),
  });
}

export function useCreateComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post<{ comment: Comment }>(`/issues/${issueId}/comments`, { body }).then((r) => r.comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', issueId] }),
  });
}
