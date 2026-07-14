import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ enums */

export const roleEnum = pgEnum('role', ['owner', 'admin', 'member']);
export const issueStatusEnum = pgEnum('issue_status', [
  'backlog',
  'todo',
  'in_progress',
  'done',
  'cancelled',
]);
export const issuePriorityEnum = pgEnum('issue_priority', [
  'none',
  'low',
  'medium',
  'high',
  'urgent',
]);

/* ------------------------------------------------------------------ tables */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  // Nullable: OAuth-only accounts (e.g. Google sign-in) have no password.
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Short-lived, single-use tokens for email verification and password reset. */
export const tokenTypeEnum = pgEnum('token_type', ['email_verify', 'password_reset']);

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: tokenTypeEnum('type').notNull(),
    // We store only a SHA-256 hash of the token; the raw value lives only in
    // the emailed link.
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('auth_tokens_user_id_idx').on(t.userId),
    index('auth_tokens_hash_idx').on(t.tokenHash),
  ],
);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Join table between users and organizations — this is where RBAC lives.
 * Composite PK (user_id, org_id): a user has exactly one role per org.
 */
export const memberships = pgTable(
  'memberships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.orgId] }),
    index('memberships_org_id_idx').on(t.orgId),
  ],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    // Short code shown in issue identifiers, e.g. "TRC" -> TRC-14.
    key: varchar('key', { length: 10 }).notNull(),
    description: text('description'),
    /**
     * Per-project monotonic counter backing `issues.issue_number`. Incremented
     * with `UPDATE ... RETURNING` inside the issue-create transaction so the
     * row lock serializes concurrent inserts (see modules/issues in Stage 3).
     */
    issueCounter: integer('issue_counter').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('projects_org_id_idx').on(t.orgId),
    // A project key is unique within its organization.
    uniqueIndex('projects_org_id_key_uq').on(t.orgId, t.key),
  ],
);

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // Sequential per project: unique together with project_id (TRC-14).
    issueNumber: integer('issue_number').notNull(),
    title: varchar('title', { length: 300 }).notNull(),
    description: text('description'),
    status: issueStatusEnum('status').notNull().default('backlog'),
    priority: issuePriorityEnum('priority').notNull().default('none'),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('issues_project_id_idx').on(t.projectId),
    index('issues_assignee_id_idx').on(t.assigneeId),
    uniqueIndex('issues_project_id_number_uq').on(t.projectId, t.issueNumber),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('comments_issue_id_idx').on(t.issueId)],
);

/**
 * Append-only audit log powering the activity feed. `entityType`/`entityId`
 * point at the affected resource; `metadata` holds action-specific detail
 * (e.g. { from: 'todo', to: 'in_progress' }).
 */
export const activity = pgTable(
  'activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entityType: varchar('entity_type', { length: 40 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 60 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('activity_org_id_idx').on(t.orgId)],
);

/** Per-user in-app notifications (e.g. issue assignment). `readAt` null = unread. */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 40 }).notNull(),
    title: varchar('title', { length: 300 }).notNull(),
    body: text('body'),
    entityType: varchar('entity_type', { length: 40 }),
    entityId: uuid('entity_id'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_id_idx').on(t.userId)],
);

/* --------------------------------------------------------------- relations */

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  reportedIssues: many(issues, { relationName: 'reporter' }),
  assignedIssues: many(issues, { relationName: 'assignee' }),
  comments: many(comments),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  projects: many(projects),
  activity: many(activity),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [memberships.orgId],
    references: [organizations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  project: one(projects, { fields: [issues.projectId], references: [projects.id] }),
  assignee: one(users, {
    fields: [issues.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
  reporter: one(users, {
    fields: [issues.reporterId],
    references: [users.id],
    relationName: 'reporter',
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  issue: one(issues, { fields: [comments.issueId], references: [issues.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const activityRelations = relations(activity, ({ one }) => ({
  organization: one(organizations, {
    fields: [activity.orgId],
    references: [organizations.id],
  }),
  actor: one(users, { fields: [activity.actorId], references: [users.id] }),
}));

/* ------------------------------------------------------- inferred TS types */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type AuthToken = typeof authTokens.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

export type Role = (typeof roleEnum.enumValues)[number];
export type IssueStatus = (typeof issueStatusEnum.enumValues)[number];
export type IssuePriority = (typeof issuePriorityEnum.enumValues)[number];
