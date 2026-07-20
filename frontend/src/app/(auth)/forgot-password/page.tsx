'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react';
import { useForgotPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { AuthField, AuthHeader } from '@/components/auth/auth-ui';

const schema = z.object({ email: z.string().trim().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

function BackToSignIn({ className }: { className?: string }) {
  return (
    <Link
      href="/login"
      className={`inline-flex items-center gap-1.5 text-sm text-accent hover:underline ${className ?? ''}`}
    >
      <ArrowLeft size={14} />
      Back to sign in
    </Link>
  );
}

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
        <AuthHeader
          icon={MailCheck}
          title="Check your inbox"
          subtitle="If an account exists for that email, we've sent a password reset link. It expires in 1 hour."
        />
        <BackToSignIn />
      </div>
    );
  }

  return (
    <div>
      <AuthHeader
        icon={KeyRound}
        title="Reset your password"
        subtitle="Enter your email and we'll send you a reset link."
      />
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
        <Button type="submit" className="h-10 w-full" loading={forgot.isPending}>
          Send reset link
        </Button>
      </form>
      <div className="mt-5 border-t border-border-subtle pt-5 text-center">
        <BackToSignIn />
      </div>
    </div>
  );
}
