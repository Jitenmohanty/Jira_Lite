'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import {
  PRIORITIES,
  STATUSES,
  STATUS_LABEL,
  type Issue,
} from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { PriorityIcon, StatusIcon } from './indicators';

type SortKey = 'identifier' | 'title' | 'status' | 'priority' | 'assignee' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const priorityRank = (p: Issue['priority']) => PRIORITIES.indexOf(p);
const statusRank = (s: Issue['status']) => STATUSES.indexOf(s);

export function ListView({
  issues,
  onOpenIssue,
}: {
  issues: Issue[];
  onOpenIssue: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const copy = [...issues];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'identifier':
          cmp = a.issueNumber - b.issueNumber;
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status':
          cmp = statusRank(a.status) - statusRank(b.status);
          break;
        case 'priority':
          cmp = priorityRank(a.priority) - priorityRank(b.priority);
          break;
        case 'assignee':
          cmp = (a.assignee?.name ?? '').localeCompare(b.assignee?.name ?? '');
          break;
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [issues, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const Header = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th className={cn('px-3 py-2 text-left font-medium', className)}>
      <button
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-muted transition-colors hover:text-foreground"
      >
        {label}
        {sortKey === k &&
          (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="px-6 pb-6">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface/60 text-xs">
            <tr className="border-b border-border">
              <Header label="Priority" k="priority" className="w-24" />
              <Header label="ID" k="identifier" className="w-24" />
              <Header label="Title" k="title" />
              <Header label="Status" k="status" className="w-36" />
              <Header label="Assignee" k="assignee" className="w-40" />
              <Header label="Updated" k="updatedAt" className="w-28" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((issue) => (
              <tr
                key={issue.id}
                onClick={() => onOpenIssue(issue.id)}
                className="cursor-pointer border-b border-border-subtle transition-colors last:border-0 hover:bg-surface-hover"
              >
                <td className="px-3 py-2">
                  <PriorityIcon priority={issue.priority} />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-faint">{issue.identifier}</td>
                <td className="max-w-0 truncate px-3 py-2">{issue.title}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <StatusIcon status={issue.status} />
                    {STATUS_LABEL[issue.status]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {issue.assignee ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar
                        name={issue.assignee.name}
                        id={issue.assignee.id}
                        src={issue.assignee.avatarUrl}
                        size="xs"
                      />
                      <span className="truncate text-muted">{issue.assignee.name}</span>
                    </span>
                  ) : (
                    <span className="text-faint">Unassigned</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-faint">{timeAgo(issue.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
