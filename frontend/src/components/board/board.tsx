'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useUpdateIssue } from '@/hooks/use-issues';
import { useUIStore } from '@/stores/ui-store';
import { STATUSES, type Issue, type IssueStatus } from '@/lib/types';
import { BoardColumn } from './board-column';
import { IssueCard } from './issue-card';

export function Board({
  projectId,
  issues,
  onOpenIssue,
}: {
  projectId: string;
  issues: Issue[];
  onOpenIssue: (id: string) => void;
}) {
  const update = useUpdateIssue(projectId);
  const openCreateIssue = useUIStore((s) => s.openCreateIssue);
  const [activeId, setActiveId] = useState<string | null>(null);

  // A small drag threshold lets plain clicks through to open the issue.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const map: Record<IssueStatus, Issue[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    };
    for (const issue of issues) map[issue.status].push(issue);
    return map;
  }, [issues]);

  const activeIssue = activeId ? issues.find((i) => i.id === activeId) : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const targetStatus = over.id as IssueStatus;
    const current = active.data.current?.status as IssueStatus | undefined;
    if (!STATUSES.includes(targetStatus) || current === targetStatus) return;
    // Optimistic: the card jumps columns immediately; rolls back on failure.
    update.mutate({ id: String(active.id), patch: { status: targetStatus } });
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto scrollbar-thin px-6 pb-6">
        {STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            issues={grouped[status]}
            onAdd={openCreateIssue}
            onOpenIssue={onOpenIssue}
          />
        ))}
      </div>
      <DragOverlay>
        {activeIssue && <IssueCard issue={activeIssue} className="w-72 rotate-2 shadow-xl" />}
      </DragOverlay>
    </DndContext>
  );
}
