'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Lock, Mail, User, UserPlus } from 'lucide-react';
import { useSignup } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { GoogleAuthButton } from '@/components/auth/google-button';
import { AuthError, AuthField, AuthHeader } from '@/components/auth/auth-ui';

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
      <AuthHeader
        icon={UserPlus}
        title="Create your account"
        subtitle="Start tracking work in minutes — no credit card required."
      />

      <GoogleAuthButton />

      <form onSubmit={onSubmit} noValidate>
        <AuthField
          id="name"
          label="Name"
          icon={User}
          autoComplete="name"
          placeholder="Ada Lovelace"
          error={errors.name?.message}
          {...register('name')}
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />

        <AuthError>{formError}</AuthError>

        <Button type="submit" className="group h-10 w-full" loading={signup.isPending}>
          Create account
          {!signup.isPending && (
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          )}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs leading-relaxed text-faint">
        By creating an account you agree to our <span className="text-muted">Terms</span> and{' '}
        <span className="text-muted">Privacy Policy</span>.
      </p>

      <div className="mt-5 border-t border-border-subtle pt-5 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
