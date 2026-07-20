'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, LogIn, Lock, Mail } from 'lucide-react';
import { useLogin } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { GoogleAuthButton } from '@/components/auth/google-button';
import { AuthError, AuthField, AuthHeader } from '@/components/auth/auth-ui';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
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
      <AuthHeader
        icon={LogIn}
        title="Welcome back"
        subtitle="Sign in to your Tracer account."
      />

      <GoogleAuthButton />

      <form onSubmit={onSubmit} noValidate>
        <AuthField
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthField
          id="password"
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
          labelRight={
            <Link href="/forgot-password" className="text-xs text-accent hover:underline">
              Forgot password?
            </Link>
          }
          {...register('password')}
        />

        <AuthError>{formError}</AuthError>

        <Button type="submit" className="group h-10 w-full" loading={login.isPending}>
          Sign in
          {!login.isPending && (
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          )}
        </Button>
      </form>

      <div className="mt-5 border-t border-border-subtle pt-5 text-center text-sm text-muted">
        No account?{' '}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </div>

      <div className="mt-5 rounded-md border border-border-subtle bg-background/50 px-3 py-2 text-center text-xs text-faint">
        Demo: owner@tracer.dev · password123
      </div>
    </div>
  );
}
