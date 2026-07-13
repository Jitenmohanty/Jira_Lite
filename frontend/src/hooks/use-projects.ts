'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Project } from '@/lib/types';

export const projectsKey = (orgId: string) => ['projects', orgId] as const;

export function useProjects(orgId: string | undefined) {
  return useQuery({
    queryKey: ['projects', orgId],
    enabled: !!orgId,
    queryFn: () =>
      api.get<{ projects: Project[] }>(`/orgs/${orgId}/projects`).then((r) => r.projects),
  });
}

export function useProject(orgId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    enabled: !!orgId && !!projectId,
    queryFn: () =>
      api
        .get<{ project: Project }>(`/orgs/${orgId}/projects/${projectId}`)
        .then((r) => r.project),
  });
}

export function useCreateProject(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; key?: string; description?: string }) =>
      api.post<{ project: Project }>(`/orgs/${orgId}/projects`, input).then((r) => r.project),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', orgId] }),
  });
}
