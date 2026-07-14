'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForgotPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, Label } from '@/components/ui/field';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    await forgot.mutateAsync(values.email).catch(() => {});
    setSent(true); // Always show the same message (no account enumeration).
  });

  if (sent) {
    return (
      <div>
        <h1 className="mb-1 text-lg font-semibold">Check your inbox</h1>
        <p className="mb-6 text-sm text-muted">
          If an account exists for that email, we&apos;ve sent a password reset link. It expires in
          1 hour.
        </p>
        <Link href="/login" className="text-sm text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">Reset your password</h1>
      <p className="mb-6 text-sm text-muted">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={onSubmit} noValidate>
        <Field>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>
        <Button type="submit" className="w-full" loading={forgot.isPending}>
          Send reset link
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
