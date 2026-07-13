import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  // Optional short code; auto-generated from the name when omitted.
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]+$/, 'Key may only contain uppercase letters and numbers')
    .min(2)
    .max(10)
    .optional(),
  description: z.string().trim().max(2000).optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
