'use client';

import { MailWarning } from 'lucide-react';
import { useMe, useResendVerification } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';

/** Thin banner prompting unverified users to confirm their email. */
export function VerifyEmailBanner() {
  const { data: user } = useMe();
  const resend = useResendVerification();
  const { toast } = useToast();

  if (!user || user.emailVerified !== false) return null;

  const onResend = async () => {
    await resend.mutateAsync().catch(() => {});
    toast({ variant: 'success', title: 'Verification email sent', description: user.email });
  };

  return (
    <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning">
      <MailWarning size={14} className="shrink-0" />
      <span className="flex-1">
        Please verify your email address to secure your account.
      </span>
      <button
        onClick={onResend}
        disabled={resend.isPending}
        className="rounded px-2 py-0.5 font-medium underline-offset-2 hover:underline disabled:opacity-50"
      >
        {resend.isPending ? 'Sending…' : 'Resend email'}
      </button>
    </div>
  );
}
