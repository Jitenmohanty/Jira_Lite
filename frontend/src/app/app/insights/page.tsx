'use client';

import { BarChart3 } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useInsights } from '@/hooks/use-insights';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  type IssuePriority,
  type IssueStatus,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ThroughputChart } from '@/components/insights/throughput-chart';

const STATUS_BAR: Record<IssueStatus, string> = {
  backlog: 'bg-status-backlog',
  todo: 'bg-status-todo',
  in_progress: 'bg-status-in-progress',
  done: 'bg-status-done',
  cancelled: 'bg-status-cancelled',
};
const PRIORITY_BAR: Record<IssuePriority, string> = {
  none: 'bg-priority-none',
  low: 'bg-priority-low',
  medium: 'bg-priority-medium',
  high: 'bg-priority-high',
  urgent: 'bg-priority-urgent',
};

export default function InsightsPage() {
  const { org } = useActiveOrg();
  const { data, isLoading } = useInsights(org?.id);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Insights</h1>

      {isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data.totals.total === 0 ? (
        <EmptyState icon={<BarChart3 size={20} />} title="No data yet" description="Create some issues to see insights." />
      ) : (
        <div className="space-y-4">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Total issues" value={data.totals.total} />
            <StatTile label="Open" value={data.totals.open} />
            <StatTile label="Completed" value={data.totals.done} />
            <StatTile label="Done · last 7 days" value={data.totals.completedLast7Days} accent />
          </div>

          {/* Throughput */}
          <Card title="Throughput" subtitle="Issues created vs. completed — last 14 days">
            <ThroughputChart data={data.throughput} />
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="By status">
              <div className="space-y-2.5">
                {STATUSES.map((s) => (
                  <BarRow
                    key={s}
                    label={STATUS_LABEL[s]}
                    value={data.statusCounts[s]}
                    max={data.totals.total}
                    colorClass={STATUS_BAR[s]}
                  />
                ))}
              </div>
            </Card>

            <Card title="By priority">
              <div className="space-y-2.5">
                {PRIORITIES.map((p) => (
                  <BarRow
                    key={p}
                    label={PRIORITY_LABEL[p]}
                    value={data.priorityCounts[p]}
                    max={data.totals.total}
                    colorClass={PRIORITY_BAR[p]}
                  />
                ))}
              </div>
            </Card>
          </div>

          <Card title="Open issues by assignee">
            {data.assigneeLoad.length === 0 ? (
              <p className="text-sm text-faint">No open issues.</p>
            ) : (
              <div className="space-y-2.5">
                {data.assigneeLoad.map((a) => (
                  <BarRow
                    key={a.name}
                    label={a.name}
                    value={a.count}
                    max={Math.max(...data.assigneeLoad.map((x) => x.count))}
                    colorClass="bg-accent"
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', accent && 'text-accent')}>
        {value}
      </p>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  colorClass,
}: {
  label: string;
  value: number;
  max: number;
  colorClass: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-hover">
        <div
          className={cn('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${value > 0 ? Math.max(pct, 4) : 0}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right tabular-nums text-muted">{value}</span>
    </div>
  );
}
