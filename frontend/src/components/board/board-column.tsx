'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Issue, IssueStatus } from '@/lib/types';
import { STATUS_LABEL } from '@/lib/types';
import { StatusIcon } from '@/components/issues/indicators';
import { DraggableIssueCard } from './issue-card';

export function BoardColumn({
  status,
  issues,
  onAdd,
  onOpenIssue,
}: {
  status: IssueStatus;
  issues: Issue[];
  onAdd: (status: IssueStatus) => void;
  onOpenIssue: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <StatusIcon status={status} />
        <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
        <span className="rounded bg-surface px-1.5 text-[11px] font-medium text-faint">
          {issues.length}
        </span>
        <button
          onClick={() => onAdd(status)}
          className="ml-auto rounded p-0.5 text-faint transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label={`Add issue to ${STATUS_LABEL[status]}`}
        >
          <Plus size={14} />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-24 flex-1 flex-col gap-2 rounded-lg border border-transparent p-1 transition-colors',
          isOver && 'border-accent/40 bg-accent/5',
        )}
      >
        {issues.map((issue) => (
          <DraggableIssueCard key={issue.id} issue={issue} onClick={() => onOpenIssue(issue.id)} />
        ))}
        {issues.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md text-xs text-faint">
            No issues
          </div>
        )}
      </div>
    </div>
  );
}
