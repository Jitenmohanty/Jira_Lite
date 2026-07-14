'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface IssueSearchResult {
  id: string;
  identifier: string;
  title: string;
  projectId: string;
}

/** Org-wide issue search; enabled once the query is at least 2 chars. */
export function useIssueSearch(orgId: string | undefined, q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ['issue-search', orgId, query],
    enabled: !!orgId && query.length >= 2,
    queryFn: () =>
      api
        .get<{ issues: IssueSearchResult[] }>(
          `/orgs/${orgId}/issues/search?q=${encodeURIComponent(query)}`,
        )
        .then((r) => r.issues),
  });
}
