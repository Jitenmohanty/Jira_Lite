'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useLogout } from '@/hooks/use-auth';
import { Avatar } from '@/components/ui/avatar';
import type { User } from '@/lib/types';

export function Topbar({ user }: { user: User }) {
  const router = useRouter();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout.mutateAsync();
    router.replace('/login');
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="inline-block h-2 w-2 rounded-sm bg-accent" />
        <span className="font-medium text-foreground">Tracer</span>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-hover"
        >
          <Avatar name={user.name} id={user.id} src={user.avatarUrl} size="sm" />
          <span className="hidden text-sm sm:inline">{user.name}</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
            <div className="animate-scale-in absolute right-0 top-full z-20 mt-1 w-52 rounded-md border border-border bg-surface-elevated p-1 shadow-xl">
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <div className="my-1 h-px bg-border-subtle" />
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
