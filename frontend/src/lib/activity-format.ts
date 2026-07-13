import type { Activity } from './types';
import { STATUS_LABEL, type IssueStatus } from './types';

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const statusLabel = (v: unknown) => {
  const s = str(v);
  return s && s in STATUS_LABEL ? STATUS_LABEL[s as IssueStatus] : (s ?? '');
};

/** Human-readable predicate following the actor's name, e.g. "created an issue: …". */
export function formatActivity(a: Activity): string {
  const m = a.metadata ?? {};
  switch (a.action) {
    case 'org.created':
      return 'created the organization';
    case 'project.created':
      return `created project ${str(m.name) ?? ''}${m.key ? ` (${str(m.key)})` : ''}`;
    case 'project.updated':
      return 'updated a project';
    case 'project.deleted':
      return `deleted project ${str(m.name) ?? ''}`;
    case 'issue.created':
      return `created an issue: ${str(m.title) ?? ''}`;
    case 'issue.status_changed':
      return `changed status ${m.from ? `from ${statusLabel(m.from)} ` : ''}to ${statusLabel(m.to)}`;
    case 'issue.updated':
      return 'updated an issue';
    case 'issue.deleted':
      return `deleted ${str(m.identifier) ?? 'an issue'}`;
    case 'comment.created':
      return 'left a comment';
    case 'member.added':
      return `added ${str(m.email) ?? 'a member'} as ${str(m.role) ?? 'member'}`;
    case 'member.role_changed':
      return `changed a member's role from ${str(m.from)} to ${str(m.to)}`;
    default:
      return a.action;
  }
}

/** Day bucket label for grouping the feed. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
