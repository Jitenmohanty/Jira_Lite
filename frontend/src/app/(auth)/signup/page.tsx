'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSignup } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, Label } from '@/components/ui/field';
import { GoogleAuthButton } from '@/components/auth/google-button';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(200, 'Password is too long'),
});
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signup.mutateAsync(values);
      router.push('/app');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION') {
        // The server returns field-level errors in `details.fieldErrors`; map
        // them back onto the inputs instead of showing a generic banner.
        const fieldErrors = (err.details as Record<string, string[]> | undefined) ?? {};
        let mapped = false;
        for (const field of ['name', 'email', 'password'] as const) {
          const message = fieldErrors[field]?.[0];
          if (message) {
            setError(field, { type: 'server', message });
            mapped = true;
          }
        }
        setFormError(mapped ? null : err.message);
        return;
      }
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  });

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">Create your account</h1>
      <p className="mb-6 text-sm text-muted">Start tracking work in minutes.</p>

      <GoogleAuthButton />

      <form onSubmit={onSubmit} noValidate>
        <Field>
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>
        <Field>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>
        <Field>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </Field>

        {formError && (
          <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" loading={signup.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
