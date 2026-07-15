'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/hooks/use-auth';
import { useRealtime } from '@/hooks/use-realtime';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { CommandPalette } from '@/components/command-palette';
import { AskTracerPanel } from '@/components/ai/ask-tracer-panel';
import { VerifyEmailBanner } from '@/components/shell/verify-email-banner';
import { Spinner } from '@/components/ui/spinner';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading } = useMe();

  // Subscribe to live updates once authenticated (no-op otherwise).
  useRealtime(!!user);

  useEffect(() => {
    if (!isLoading && user === null) router.replace('/login');
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <VerifyEmailBanner />
        <main className="min-h-0 flex-1 overflow-auto scrollbar-thin">{children}</main>
      </div>
      <CommandPalette />
      <AskTracerPanel />
    </div>
  );
}
