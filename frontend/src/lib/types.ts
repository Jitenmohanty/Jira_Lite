// Shared API types mirroring the backend responses. The two apps talk only
// over HTTP, so these are hand-maintained rather than imported.

export type Role = 'owner' | 'admin' | 'member';
export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';
export type IssuePriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  role: Role;
  createdAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  key: string;
  description: string | null;
  issueCounter: number;
  createdAt: string;
}

export interface UserMini {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Issue {
  id: string;
  projectId: string;
  issueNumber: number;
  identifier: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: string | null;
  reporterId: string;
  assignee: UserMini | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueDetail extends Issue {
  project: { id: string; key: string; name: string; orgId: string };
  reporter: UserMini | null;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: UserMini | null;
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  joinedAt: string;
}

export interface Activity {
  id: string;
  orgId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: UserMini | null;
}

export const STATUSES: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled'];
export const PRIORITIES: IssuePriority[] = ['none', 'low', 'medium', 'high', 'urgent'];

export const STATUS_LABEL: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const PRIORITY_LABEL: Record<IssuePriority, string> = {
  none: 'No priority',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}
