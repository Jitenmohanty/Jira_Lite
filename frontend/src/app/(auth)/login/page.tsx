'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, Label } from '@/components/ui/field';
import { GoogleAuthButton } from '@/components/auth/google-button';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Surface OAuth failures redirected back from the backend (?error=...).
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error');
    if (error === 'oauth') setFormError('Google sign-in failed. Please try again.');
    else if (error === 'oauth_unavailable') setFormError('Google sign-in is not configured.');
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      router.push('/app');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  });

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-muted">Sign in to your Tracer account.</p>

      <GoogleAuthButton />

      <form onSubmit={onSubmit} noValidate>
        <Field>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>
        <Field>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </Field>

        {formError && (
          <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        No account?{' '}
        <Link href="/signup" className="text-accent hover:underline">
          Create one
        </Link>
      </p>

      <div className="mt-6 rounded-md border border-border-subtle bg-background/50 px-3 py-2 text-center text-xs text-faint">
        Demo: owner@tracer.dev · password123
      </div>
    </div>
  );
}
