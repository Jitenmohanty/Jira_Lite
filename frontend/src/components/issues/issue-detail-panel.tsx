'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useIssue, useComments, useCreateComment } from '@/hooks/use-issue';
import { useUpdateIssue, useDeleteIssue } from '@/hooks/use-issues';
import { useMembers } from '@/hooks/use-orgs';
import { useActiveOrg } from '@/hooks/use-active-org';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  type IssuePriority,
  type IssueStatus,
} from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { StatusIcon, PriorityIcon } from './indicators';

export function IssueDetailPanel({
  issueId,
  projectId,
  onClose,
}: {
  issueId: string;
  projectId: string;
  onClose: () => void;
}) {
  const { org } = useActiveOrg();
  const { data: issue, isLoading } = useIssue(issueId);
  const { data: members } = useMembers(org?.id);
  const update = useUpdateIssue(projectId);
  const del = useDeleteIssue(projectId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Sync local edit buffers when the issue loads/changes.
  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description ?? '');
    }
  }, [issue]);

  // Esc closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveTitle = () => {
    if (issue && title.trim() && title !== issue.title) {
      update.mutate({ id: issue.id, patch: { title: title.trim() } });
    }
  };
  const saveDescription = () => {
    if (issue && description !== (issue.description ?? '')) {
      update.mutate({ id: issue.id, patch: { description: description || null } });
    }
  };

  const onDelete = async () => {
    if (!issue) return;
    if (!window.confirm(`Delete ${issue.identifier}? This cannot be undone.`)) return;
    await del.mutateAsync(issue.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="animate-fade-in absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex h-full w-full max-w-[560px] flex-col border-l border-border bg-background shadow-2xl"
        style={{ animation: 'slide-up 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="font-mono text-sm text-muted">{issue?.identifier ?? '···'}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-danger"
              aria-label="Delete issue"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {isLoading || !issue ? (
          <div className="flex flex-1 items-center justify-center text-muted">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
            <div className="p-5">
              {/* Title (inline edit) */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-lg font-semibold tracking-tight text-foreground transition-colors hover:border-border focus:border-accent focus:outline-none"
              />

              {/* Description (inline edit) */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
                placeholder="Add a description…"
                className="mt-2 min-h-[90px] w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-muted placeholder:text-faint transition-colors hover:border-border focus:border-accent focus:text-foreground focus:outline-none"
              />

              {/* Properties */}
              <div className="mt-4 space-y-3 rounded-lg border border-border-subtle bg-surface/40 p-3">
                <PropertyRow label="Status">
                  <Select
                    className="h-8"
                    value={issue.status}
                    onChange={(e) =>
                      update.mutate({
                        id: issue.id,
                        patch: { status: e.target.value as IssueStatus },
                      })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </PropertyRow>
                <PropertyRow label="Priority">
                  <Select
                    className="h-8"
                    value={issue.priority}
                    onChange={(e) =>
                      update.mutate({
                        id: issue.id,
                        patch: { priority: e.target.value as IssuePriority },
                      })
                    }
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </Select>
                </PropertyRow>
                <PropertyRow label="Assignee">
                  <Select
                    className="h-8"
                    value={issue.assigneeId ?? ''}
                    onChange={(e) =>
                      update.mutate({
                        id: issue.id,
                        patch: { assigneeId: e.target.value || null },
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {members?.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </PropertyRow>
                <div className="flex items-center justify-between px-1 pt-1 text-xs text-faint">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusIcon status={issue.status} />
                    <PriorityIcon priority={issue.priority} />
                    {issue.reporter && <>Reported by {issue.reporter.name}</>}
                  </span>
                  <span>Updated {timeAgo(issue.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border-subtle" />
            <CommentThread issueId={issue.id} />
          </div>
        )}
      </aside>
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-muted">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function CommentThread({ issueId }: { issueId: string }) {
  const { data: comments, isLoading } = useComments(issueId);
  const create = useCreateComment(issueId);
  const [body, setBody] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setBody('');
    await create.mutateAsync(text).catch(() => setBody(text));
  };

  return (
    <div className="p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
        Comments {comments && comments.length > 0 && `(${comments.length})`}
      </h3>

      {isLoading ? (
        <p className="text-sm text-faint">Loading…</p>
      ) : comments && comments.length > 0 ? (
        <ul className="mb-4 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <Avatar
                name={c.author?.name ?? 'Unknown'}
                id={c.author?.id}
                src={c.author?.avatarUrl}
                size="sm"
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{c.author?.name ?? 'Unknown'}</span>
                  <span className="text-xs text-faint">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-muted">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-faint">No comments yet.</p>
      )}

      <div className="space-y-2">
        <textarea
          ref={ref}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
          }}
          placeholder="Leave a comment… (⌘/Ctrl + Enter to send)"
          className={cn(
            'min-h-[70px] w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm',
            'placeholder:text-faint focus:border-accent focus:outline-none',
          )}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} loading={create.isPending} disabled={!body.trim()}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
