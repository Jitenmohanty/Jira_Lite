'use client';

import { useEffect } from 'react';
import { useOrgs } from './use-orgs';
import { useUIStore } from '@/stores/ui-store';
import type { Org } from '@/lib/types';

/**
 * Resolves the org the user is currently working in. Falls back to the first
 * org and keeps the persisted selection valid if orgs change.
 */
export function useActiveOrg(): { org: Org | undefined; orgs: Org[]; isLoading: boolean } {
  const { data: orgs, isLoading } = useOrgs();
  const activeOrgId = useUIStore((s) => s.activeOrgId);
  const setActiveOrgId = useUIStore((s) => s.setActiveOrgId);

  const org = orgs?.find((o) => o.id === activeOrgId) ?? orgs?.[0];

  useEffect(() => {
    if (org && org.id !== activeOrgId) setActiveOrgId(org.id);
  }, [org, activeOrgId, setActiveOrgId]);

  return { org, orgs: orgs ?? [], isLoading };
}
