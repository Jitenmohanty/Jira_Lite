'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { emitToast } from '@/lib/toast-bus';
import type { Issue, IssueDetail, IssuePriority, IssueStatus } from '@/lib/types';

export interface IssueFilters {
  status?: IssueStatus;
  priority?: IssuePriority;
  assignee?: string; // user id or 'none'
}

/** All cache entries for a project's issue lists share this key prefix. */
export const issuesRoot = (projectId: string) => ['issues', projectId] as const;

function buildQuery(filters: IssueFilters): string {
  const p = new URLSearchParams({ limit: '100' });
  if (filters.status) p.set('status', filters.status);
  if (filters.priority) p.set('priority', filters.priority);
  if (filters.assignee) p.set('assignee', filters.assignee);
  return p.toString();
}

export function useIssues(projectId: string, filters: IssueFilters) {
  return useQuery({
    queryKey: [...issuesRoot(projectId), filters],
    queryFn: () =>
      api
        .get<{ issues: Issue[] }>(`/projects/${projectId}/issues?${buildQuery(filters)}`)
        .then((r) => r.issues),
  });
}

export function useCreateIssue(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      description?: string | null;
      status?: IssueStatus;
      priority?: IssuePriority;
      assigneeId?: string | null;
    }) => api.post<{ issue: Issue }>(`/projects/${projectId}/issues`, input).then((r) => r.issue),
    onSuccess: (issue) => {
      qc.invalidateQueries({ queryKey: issuesRoot(projectId) });
      emitToast({ variant: 'success', title: `Created ${issue.identifier}` });
    },
  });
}

export type IssuePatch = Partial<
  Pick<Issue, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'assignee'>
>;

/**
 * Patch an issue with an optimistic cache update. Used by the board (status via
 * drag) and the detail panel. On error the previous cache is restored; on
 * settle the lists are revalidated against the server.
 */
export function useUpdateIssue(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: IssuePatch }) =>
      api.patch<{ issue: IssueDetail }>(`/issues/${id}`, patch).then((r) => r.issue),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: issuesRoot(projectId) });
      await qc.cancelQueries({ queryKey: ['issue', id] });
      const previous = qc.getQueriesData<Issue[]>({ queryKey: issuesRoot(projectId) });
      const previousDetail = qc.getQueryData<IssueDetail>(['issue', id]);
      qc.setQueriesData<Issue[]>({ queryKey: issuesRoot(projectId) }, (old) =>
        old?.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      );
      // Also patch the detail cache if present.
      qc.setQueryData<IssueDetail>(['issue', id], (old) => (old ? { ...old, ...patch } : old));
      return { previous, previousDetail };
    },
    onError: (_err, vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      // Roll back the detail cache too — otherwise the open panel keeps showing
      // the failed optimistic value until the onSettled refetch lands.
      if (ctx) qc.setQueryData(['issue', vars.id], ctx.previousDetail);
      emitToast({
        variant: 'error',
        title: 'Update failed',
        description: 'Your change was reverted.',
      });
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: issuesRoot(projectId) });
      qc.invalidateQueries({ queryKey: ['issue', vars.id] });
    },
  });
}

export function useDeleteIssue(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/issues/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: issuesRoot(projectId) }),
  });
}
