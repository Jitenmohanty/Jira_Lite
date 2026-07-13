import { cn } from '@/lib/utils';
import type { IssuePriority, IssueStatus } from '@/lib/types';

const STATUS_COLOR: Record<IssueStatus, string> = {
  backlog: 'text-status-backlog',
  todo: 'text-status-todo',
  in_progress: 'text-status-in-progress',
  done: 'text-status-done',
  cancelled: 'text-status-cancelled',
};

/** Linear-style status glyph — a ring that fills as work progresses. */
export function StatusIcon({ status, className }: { status: IssueStatus; className?: string }) {
  const color = STATUS_COLOR[status];
  return (
    <svg
      viewBox="0 0 14 14"
      className={cn('h-3.5 w-3.5 shrink-0', color, className)}
      fill="none"
      aria-hidden
    >
      {status === 'backlog' && (
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      )}
      {status === 'todo' && <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />}
      {status === 'in_progress' && (
        <>
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7 L7 1 A6 6 0 0 1 12.2 9.5 Z" fill="currentColor" />
        </>
      )}
      {status === 'done' && (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path
            d="M4.3 7.2l1.9 1.9 3.6-3.9"
            stroke="rgb(8 9 10)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}
      {status === 'cancelled' && (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path
            d="M4.8 4.8l4.4 4.4M9.2 4.8l-4.4 4.4"
            stroke="rgb(8 9 10)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

const PRIORITY_COLOR: Record<IssuePriority, string> = {
  none: 'text-priority-none',
  low: 'text-priority-low',
  medium: 'text-priority-medium',
  high: 'text-priority-high',
  urgent: 'text-priority-urgent',
};

/** Signal-bar priority glyph (urgent shows an alert block). */
export function PriorityIcon({
  priority,
  className,
}: {
  priority: IssuePriority;
  className?: string;
}) {
  const color = PRIORITY_COLOR[priority];
  if (priority === 'urgent') {
    return (
      <svg viewBox="0 0 14 14" className={cn('h-3.5 w-3.5 shrink-0', color, className)} aria-hidden>
        <rect x="1" y="1" width="12" height="12" rx="3" fill="currentColor" />
        <rect x="6.25" y="3.5" width="1.5" height="4.5" rx="0.75" fill="rgb(8 9 10)" />
        <rect x="6.25" y="9.2" width="1.5" height="1.5" rx="0.75" fill="rgb(8 9 10)" />
      </svg>
    );
  }
  const levels: Record<Exclude<IssuePriority, 'urgent'>, number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
  };
  const active = levels[priority];
  const bars = [
    { x: 2, h: 4, y: 8 },
    { x: 6, h: 7, y: 5 },
    { x: 10, h: 10, y: 2 },
  ];
  return (
    <svg viewBox="0 0 14 14" className={cn('h-3.5 w-3.5 shrink-0', color, className)} aria-hidden>
      {bars.map((b, i) => (
        <rect
          key={b.x}
          x={b.x}
          y={b.y}
          width="2.5"
          height={b.h}
          rx="1"
          fill="currentColor"
          opacity={priority === 'none' ? 0.35 : i < active ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}
