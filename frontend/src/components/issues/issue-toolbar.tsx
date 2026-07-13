'use client';

import { KanbanSquare, List, Plus } from 'lucide-react';
import { useMembers } from '@/hooks/use-orgs';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useUIStore } from '@/stores/ui-store';
import type { IssueFilters } from '@/hooks/use-issues';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  type IssuePriority,
  type IssueStatus,
} from '@/lib/types';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function IssueToolbar({
  filters,
  onChange,
}: {
  filters: IssueFilters;
  onChange: (f: IssueFilters) => void;
}) {
  const { org } = useActiveOrg();
  const { data: members } = useMembers(org?.id);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const openCreateIssue = useUIStore((s) => s.openCreateIssue);

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3">
      <div className="flex items-center rounded-md border border-border bg-surface p-0.5">
        <ViewButton active={viewMode === 'board'} onClick={() => setViewMode('board')}>
          <KanbanSquare size={14} /> Board
        </ViewButton>
        <ViewButton active={viewMode === 'list'} onClick={() => setViewMode('list')}>
          <List size={14} /> List
        </ViewButton>
      </div>

      <div className="ml-1 flex flex-wrap items-center gap-2">
        {viewMode === 'list' && (
          <Select
            className="h-8 w-auto"
            value={filters.status ?? ''}
            onChange={(e) =>
              onChange({ ...filters, status: (e.target.value || undefined) as IssueStatus })
            }
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        )}
        <Select
          className="h-8 w-auto"
          value={filters.priority ?? ''}
          onChange={(e) =>
            onChange({ ...filters, priority: (e.target.value || undefined) as IssuePriority })
          }
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
        <Select
          className="h-8 w-auto"
          value={filters.assignee ?? ''}
          onChange={(e) => onChange({ ...filters, assignee: e.target.value || undefined })}
        >
          <option value="">All assignees</option>
          <option value="none">Unassigned</option>
          {members?.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      <Button size="sm" className="ml-auto" onClick={() => openCreateIssue()}>
        <Plus size={15} />
        New issue
      </Button>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-surface-hover text-foreground' : 'text-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
