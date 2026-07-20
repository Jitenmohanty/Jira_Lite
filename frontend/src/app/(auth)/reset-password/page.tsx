'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useResetPassword } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AuthError, AuthField, AuthHeader } from '@/components/auth/auth-ui';

const schema = z.object({ password: z.string().min(8, 'At least 8 characters') });
type FormValues = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const reset = useResetPassword();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div>
        <AuthHeader
          icon={ShieldAlert}
          title="Invalid reset link"
          subtitle="This link is missing its token or has expired. Request a new one to continue."
        />
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <ArrowLeft size={14} />
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <AuthHeader
          icon={CheckCircle2}
          title="Password updated"
          subtitle="You can now sign in with your new password."
        />
        <Button className="h-10 w-full" onClick={() => router.push('/login')}>
          Sign in
        </Button>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await reset.mutateAsync({ token, password: values.password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  });

  return (
    <div>
      <AuthHeader
        icon={ShieldCheck}
        title="Set a new password"
        subtitle="Choose a strong password for your account."
      />
      <form onSubmit={onSubmit} noValidate>
        <AuthField
          id="password"
          label="New password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
        <AuthError>{error}</AuthError>
        <Button type="submit" className="h-10 w-full" loading={reset.isPending}>
          Update password
        </Button>
      </form>
      <div className="mt-5 border-t border-border-subtle pt-5 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
