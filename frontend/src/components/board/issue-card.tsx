'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { Issue } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { PriorityIcon } from '@/components/issues/indicators';

/** Presentational card — also used inside the drag overlay. */
export function IssueCard({
  issue,
  onClick,
  className,
}: {
  issue: Issue;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-md border border-border bg-surface p-2.5 shadow-sm transition-all duration-150',
        'hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-hover hover:shadow-md',
        className,
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-faint">
          <PriorityIcon priority={issue.priority} />
          {issue.identifier}
        </span>
        {issue.assignee && (
          <Avatar
            name={issue.assignee.name}
            id={issue.assignee.id}
            src={issue.assignee.avatarUrl}
            size="xs"
          />
        )}
      </div>
      <p className="line-clamp-2 text-sm leading-snug text-foreground">{issue.title}</p>
    </div>
  );
}

/** Draggable wrapper used within a column. */
export function DraggableIssueCard({ issue, onClick }: { issue: Issue; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
    data: { status: issue.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'opacity-40')}
    >
      <IssueCard issue={issue} onClick={onClick} />
    </div>
  );
}
