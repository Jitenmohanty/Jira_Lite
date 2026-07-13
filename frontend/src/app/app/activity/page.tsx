'use client';

import { Activity as ActivityIcon } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useActivity } from '@/hooks/use-activity';
import { dayLabel, formatActivity } from '@/lib/activity-format';
import { timeAgo } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { Activity } from '@/lib/types';

export default function ActivityPage() {
  const { org } = useActiveOrg();
  const { data: items, isLoading } = useActivity(org?.id);

  // Group consecutive items by day.
  const groups: { label: string; items: Activity[] }[] = [];
  for (const item of items ?? []) {
    const label = dayLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Activity</h1>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <EmptyState
          icon={<ActivityIcon size={20} />}
          title="No activity yet"
          description="Actions across your organization will show up here."
        />
      )}

      {!isLoading && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
                {group.label}
              </h2>
              <ul className="space-y-3 border-l border-border-subtle pl-4">
                {group.items.map((item) => (
                  <li key={item.id} className="relative flex items-start gap-2.5">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-border ring-4 ring-background" />
                    <Avatar
                      name={item.actor?.name ?? 'Someone'}
                      id={item.actor?.id}
                      src={item.actor?.avatarUrl}
                      size="sm"
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{item.actor?.name ?? 'Someone'}</span>{' '}
                      <span className="text-muted">{formatActivity(item)}</span>
                      <span className="ml-2 text-xs text-faint">{timeAgo(item.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
