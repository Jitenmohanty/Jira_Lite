'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPassword } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, Label } from '@/components/ui/field';

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
    return <p className="text-sm text-danger">Missing or invalid reset link.</p>;
  }

  if (done) {
    return (
      <div>
        <h1 className="mb-1 text-lg font-semibold">Password updated</h1>
        <p className="mb-6 text-sm text-muted">You can now sign in with your new password.</p>
        <Button className="w-full" onClick={() => router.push('/login')}>
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
      <h1 className="mb-1 text-lg font-semibold">Set a new password</h1>
      <p className="mb-6 text-sm text-muted">Choose a strong password for your account.</p>
      <form onSubmit={onSubmit} noValidate>
        <Field>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </Field>
        {error && (
          <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={reset.isPending}>
          Update password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
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
