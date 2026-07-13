import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/15 blur-[130px]"
      />
      <div className="relative z-10 w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />
          <span className="text-lg font-semibold tracking-tight">Tracer</span>
        </Link>
        <div className="animate-scale-in rounded-lg border border-border bg-surface/80 p-6 backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}
