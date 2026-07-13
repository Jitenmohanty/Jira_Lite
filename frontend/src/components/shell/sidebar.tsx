'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Layers, Plus, Settings } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useProjects } from '@/hooks/use-projects';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { OrgSwitcher } from './org-switcher';
import { CreateProjectDialog } from './create-project-dialog';
import { CreateOrgDialog } from './create-org-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export function Sidebar() {
  const pathname = usePathname();
  const { org } = useActiveOrg();
  const { data: projects, isLoading } = useProjects(org?.id);
  const [projectDialog, setProjectDialog] = useState(false);
  const [orgDialog, setOrgDialog] = useState(false);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <>
      {/* Backdrop on mobile when the drawer is open. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-60 shrink-0 flex-col border-r border-border bg-surface transition-transform md:static md:z-auto md:translate-x-0 md:bg-surface/40',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
      <div className="p-2">
        <OrgSwitcher onCreateOrg={() => setOrgDialog(true)} />
      </div>

      <div className="px-2 pb-2">
        <NavLink href="/app" icon={<Layers size={15} />} active={pathname === '/app'}>
          Dashboard
        </NavLink>
        <NavLink
          href="/app/activity"
          icon={<Activity size={15} />}
          active={pathname === '/app/activity'}
        >
          Activity
        </NavLink>
        <NavLink
          href="/app/members"
          icon={<Settings size={15} />}
          active={pathname === '/app/members'}
        >
          Members
        </NavLink>
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">
          Projects
        </span>
        <button
          onClick={() => setProjectDialog(true)}
          className="rounded p-0.5 text-faint transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label="New project"
          disabled={!org}
        >
          <Plus size={15} />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto scrollbar-thin px-2">
        {isLoading && (
          <div className="space-y-1.5 px-1 py-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        )}
        {!isLoading && projects?.length === 0 && (
          <p className="px-2 py-2 text-xs text-faint">No projects yet.</p>
        )}
        {projects?.map((p) => {
          const active = pathname === `/app/projects/${p.id}`;
          return (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-surface-hover text-foreground'
                  : 'text-muted hover:bg-surface-hover hover:text-foreground',
              )}
            >
              <span className="flex h-4 min-w-4 items-center justify-center rounded bg-border px-1 text-[9px] font-bold text-muted">
                {p.key}
              </span>
              <span className="truncate">{p.name}</span>
            </Link>
          );
        })}
      </nav>

      {org && (
        <CreateProjectDialog
          orgId={org.id}
          open={projectDialog}
          onClose={() => setProjectDialog(false)}
        />
      )}
      <CreateOrgDialog open={orgDialog} onClose={() => setOrgDialog(false)} />
      </aside>
    </>
  );
}

function NavLink({
  href,
  icon,
  active,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  active: boolean;
  children: React.ReactNode;
}) {
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  return (
    <Link
      href={href}
      onClick={() => setSidebarOpen(false)}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        active
          ? 'bg-surface-hover text-foreground'
          : 'text-muted hover:bg-surface-hover hover:text-foreground',
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
