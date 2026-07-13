import { z } from 'zod';

export const createOrgSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  // Optional custom slug; otherwise derived from the name.
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .min(2)
    .max(60)
    .optional(),
});

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export const changeRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
