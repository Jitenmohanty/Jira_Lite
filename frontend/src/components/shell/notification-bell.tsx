'use client';

import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/hooks/use-notifications';
import { cn, timeAgo } from '@/lib/utils';

export function NotificationBell() {
  const { data } = useNotifications();
  const markAll = useMarkAllRead();
  const markOne = useMarkRead();
  const [open, setOpen] = useState(false);

  const unread = data?.unread ?? 0;
  const items = data?.notifications ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="animate-scale-in absolute right-0 top-full z-20 mt-1 w-80 overflow-hidden rounded-md border border-border bg-surface-elevated shadow-xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-faint">You&apos;re all caught up.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => n.readAt === null && markOne.mutate(n.id)}
                    className={cn(
                      'flex w-full items-start gap-2 border-b border-border-subtle px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-hover',
                      n.readAt === null && 'bg-accent/5',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        n.readAt === null ? 'bg-accent' : 'bg-transparent',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      {n.body && <span className="block text-xs text-muted">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-faint">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
