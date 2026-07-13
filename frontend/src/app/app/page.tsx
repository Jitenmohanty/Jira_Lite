'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, FolderPlus, Plus } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateProjectDialog } from '@/components/shell/create-project-dialog';
import { CreateOrgDialog } from '@/components/shell/create-org-dialog';

export default function DashboardPage() {
  const { org, isLoading: orgsLoading } = useActiveOrg();
  const { data: projects, isLoading } = useProjects(org?.id);
  const [projectDialog, setProjectDialog] = useState(false);
  const [orgDialog, setOrgDialog] = useState(false);

  if (orgsLoading) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {org ? org.name : 'Welcome to Tracer'}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {org ? 'Your projects' : 'Create an organization to get started.'}
          </p>
        </div>
        {org && (
          <Button size="sm" onClick={() => setProjectDialog(true)}>
            <Plus size={15} />
            New project
          </Button>
        )}
      </div>

      {!org && (
        <EmptyState
          icon={<Building2 size={20} />}
          title="No organization yet"
          description="Organizations hold your projects and teammates. Create one to begin."
          action={<Button onClick={() => setOrgDialog(true)}>Create organization</Button>}
        />
      )}

      {org && isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {org && !isLoading && projects?.length === 0 && (
        <EmptyState
          icon={<FolderPlus size={20} />}
          title="No projects yet"
          description="Projects group related issues. Create your first one to start tracking work."
          action={<Button onClick={() => setProjectDialog(true)}>Create project</Button>}
        />
      )}

      {org && !isLoading && projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-hover"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 items-center rounded bg-border px-1.5 text-[10px] font-bold text-muted">
                  {p.key}
                </span>
                <span className="truncate font-medium">{p.name}</span>
              </div>
              <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted">
                {p.description || 'No description'}
              </p>
            </Link>
          ))}
        </div>
      )}

      {org && (
        <CreateProjectDialog
          orgId={org.id}
          open={projectDialog}
          onClose={() => setProjectDialog(false)}
        />
      )}
      <CreateOrgDialog open={orgDialog} onClose={() => setOrgDialog(false)} />
    </div>
  );
}
