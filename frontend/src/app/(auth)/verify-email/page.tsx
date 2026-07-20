'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useVerifyEmail } from '@/hooks/use-auth';

type Status = 'pending' | 'ok' | 'error';

const STATES: Record<Status, { icon: typeof CheckCircle2; tone: string; title: string; desc: string }> = {
  pending: {
    icon: Loader2,
    tone: 'text-muted',
    title: 'Verifying your email…',
    desc: 'Hang tight while we confirm your address.',
  },
  ok: {
    icon: CheckCircle2,
    tone: 'text-success',
    title: 'Email verified',
    desc: 'Your email address is confirmed and your account is ready.',
  },
  error: {
    icon: XCircle,
    tone: 'text-danger',
    title: 'Verification failed',
    desc: 'This link is invalid or has expired. Try requesting a new one.',
  },
};

function VerifyInner() {
  const token = useSearchParams().get('token') ?? '';
  const verify = useVerifyEmail();
  const [status, setStatus] = useState<Status>('pending');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against double-run in dev strict mode
    ran.current = true;
    if (!token) {
      setStatus('error');
      return;
    }
    verify
      .mutateAsync(token)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [token, verify]);

  const { icon: Icon, tone, title, desc } = STATES[status];

  return (
    <div className="flex flex-col items-center py-2 text-center">
      <span
        className={`mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-surface-elevated ${tone}`}
      >
        <Icon size={26} className={status === 'pending' ? 'animate-spin' : undefined} />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-muted">{desc}</p>

      {status !== 'pending' && (
        <Link
          href="/app"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          Go to Tracer
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
