import { z } from 'zod';

const statusEnum = z.enum(['backlog', 'todo', 'in_progress', 'done', 'cancelled']);
const priorityEnum = z.enum(['none', 'low', 'medium', 'high', 'urgent']);

export const createIssueSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  description: z.string().trim().max(10000).nullable().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const updateIssueSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(10000).nullable(),
    status: statusEnum,
    priority: priorityEnum,
    assigneeId: z.string().uuid().nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const listIssuesQuerySchema = z.object({
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  // A user id, or the literal "none" to filter unassigned issues.
  assignee: z.union([z.string().uuid(), z.literal('none')]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
