'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CircleDashed } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useProject } from '@/hooks/use-projects';
import { useIssues, type IssueFilters } from '@/hooks/use-issues';
import { useUIStore } from '@/stores/ui-store';
import { Board } from '@/components/board/board';
import { ListView } from '@/components/issues/list-view';
import { IssueToolbar } from '@/components/issues/issue-toolbar';
import { CreateIssueDialog } from '@/components/issues/create-issue-dialog';
import { IssueDetailPanel } from '@/components/issues/issue-detail-panel';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <ProjectBoard projectId={params.projectId} />
    </Suspense>
  );
}

function ProjectBoard({ projectId }: { projectId: string }) {
  const { org } = useActiveOrg();
  const { data: project } = useProject(org?.id, projectId);
  const viewMode = useUIStore((s) => s.viewMode);
  const openCreateIssue = useUIStore((s) => s.openCreateIssue);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<IssueFilters>({});
  const { data: issues, isLoading } = useIssues(projectId, filters);

  // The open issue lives in the URL (?issue=…) so it's deep-linkable/shareable.
  const selectedIssueId = searchParams.get('issue');
  const openIssue = (id: string) => router.push(`${pathname}?issue=${id}`, { scroll: false });
  const closeIssue = () => router.push(pathname, { scroll: false });

  const hasFilters = Boolean(filters.status || filters.priority || filters.assignee);

  // Keyboard shortcut: "C" creates an issue (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'c' && !selectedIssueId) {
        e.preventDefault();
        openCreateIssue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCreateIssue, selectedIssueId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 pt-5">
        <span className="rounded bg-border px-1.5 py-0.5 text-xs font-bold text-muted">
          {project?.key ?? '···'}
        </span>
        <h1 className="text-lg font-semibold tracking-tight">{project?.name ?? 'Project'}</h1>
      </div>

      <IssueToolbar filters={filters} onChange={setFilters} />

      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex gap-4 px-6 pb-6">
            {[0, 1, 2, 3].map((c) => (
              <div key={c} className="w-72 space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : issues && issues.length === 0 ? (
          <div className="px-6">
            <EmptyState
              icon={<CircleDashed size={20} />}
              title={hasFilters ? 'No issues match these filters' : 'No issues yet'}
              description={
                hasFilters ? 'Try clearing a filter.' : 'Create your first issue to get started.'
              }
              action={
                !hasFilters ? (
                  <Button onClick={() => openCreateIssue()}>New issue</Button>
                ) : undefined
              }
            />
          </div>
        ) : viewMode === 'board' ? (
          <Board projectId={projectId} issues={issues ?? []} onOpenIssue={openIssue} />
        ) : (
          <ListView issues={issues ?? []} onOpenIssue={openIssue} />
        )}
      </div>

      <CreateIssueDialog projectId={projectId} />

      {selectedIssueId && (
        <IssueDetailPanel issueId={selectedIssueId} projectId={projectId} onClose={closeIssue} />
      )}
    </div>
  );
}
