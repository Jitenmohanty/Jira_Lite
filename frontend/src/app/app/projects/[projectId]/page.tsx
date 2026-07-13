'use client';

import { KanbanSquare } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useProject } from '@/hooks/use-projects';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

// The board (Stage 5) replaces this placeholder.
export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { org } = useActiveOrg();
  const { data: project, isLoading } = useProject(org?.id, projectId);

  return (
    <div className="mx-auto max-w-5xl p-8">
      {isLoading ? (
        <Skeleton className="mb-6 h-8 w-56" />
      ) : (
        <h1 className="mb-6 flex items-center gap-2 text-xl font-semibold tracking-tight">
          <span className="rounded bg-border px-1.5 py-0.5 text-xs font-bold text-muted">
            {project?.key}
          </span>
          {project?.name}
        </h1>
      )}
      <EmptyState icon={<KanbanSquare size={20} />} title="The board is coming in the next stage" />
    </div>
  );
}
