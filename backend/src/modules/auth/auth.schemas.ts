import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1, 'Name is required').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
