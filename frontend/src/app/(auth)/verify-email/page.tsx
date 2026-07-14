'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useVerifyEmail } from '@/hooks/use-auth';
import { Spinner } from '@/components/ui/spinner';

function VerifyInner() {
  const token = useSearchParams().get('token') ?? '';
  const verify = useVerifyEmail();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
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

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-muted">
        <Spinner className="h-5 w-5" />
        <p className="text-sm">Verifying your email…</p>
      </div>
    );
  }

  if (status === 'ok') {
    return (
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <CheckCircle2 className="text-success" size={28} />
        <h1 className="text-lg font-semibold">Email verified</h1>
        <p className="mb-2 text-sm text-muted">Your email address is confirmed.</p>
        <Link href="/app" className="text-sm text-accent hover:underline">
          Go to Tracer
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2 text-center">
      <XCircle className="text-danger" size={28} />
      <h1 className="text-lg font-semibold">Verification failed</h1>
      <p className="mb-2 text-sm text-muted">This link is invalid or has expired.</p>
      <Link href="/app" className="text-sm text-accent hover:underline">
        Go to Tracer
      </Link>
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
