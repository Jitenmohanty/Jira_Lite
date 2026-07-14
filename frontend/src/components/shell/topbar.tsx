'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Menu, Search } from 'lucide-react';
import { useLogout } from '@/hooks/use-auth';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useProjects } from '@/hooks/use-projects';
import { useUIStore } from '@/stores/ui-store';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from './theme-toggle';
import { NotificationBell } from './notification-bell';
import type { User } from '@/lib/types';

export function Topbar({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const { org } = useActiveOrg();
  const projectMatch = pathname.match(/^\/app\/projects\/([^/]+)/);
  const { data: projects } = useProjects(projectMatch ? org?.id : undefined);
  const project = projectMatch ? projects?.find((p) => p.id === projectMatch[1]) : undefined;
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout.mutateAsync();
    router.replace('/login');
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <span className="inline-block h-2 w-2 shrink-0 rounded-sm bg-accent" />
        <span className="truncate font-medium text-foreground">{org?.name ?? 'Tracer'}</span>
        {project && (
          <>
            <span className="text-faint">/</span>
            <span className="flex min-w-0 items-center gap-1.5 text-muted">
              <span className="rounded bg-border px-1 text-[10px] font-bold">{project.key}</span>
              <span className="truncate">{project.name}</span>
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setCommandOpen(true)}
          className="mr-1 hidden items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-hover sm:flex"
          aria-label="Open command palette"
        >
          <Search size={13} />
          <span>Search</span>
          <kbd className="rounded border border-border-subtle px-1 text-[10px]">⌘K</kbd>
        </button>
        <NotificationBell />
        <ThemeToggle />
        <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-hover"
        >
          <Avatar name={user.name} id={user.id} src={user.avatarUrl} size="sm" />
          <span className="hidden text-sm sm:inline">{user.name}</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
            <div className="animate-scale-in absolute right-0 top-full z-20 mt-1 w-52 rounded-md border border-border bg-surface-elevated p-1 shadow-xl">
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <div className="my-1 h-px bg-border-subtle" />
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </header>
  );
}
