'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useUIStore } from '@/stores/ui-store';
import { cn, initials } from '@/lib/utils';

export function OrgSwitcher({ onCreateOrg }: { onCreateOrg: () => void }) {
  const { org, orgs } = useActiveOrg();
  const setActiveOrgId = useUIStore((s) => s.setActiveOrgId);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-hover"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded bg-accent text-[10px] font-bold text-accent-foreground">
          {org ? initials(org.name) : '·'}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {org?.name ?? 'No organization'}
        </span>
        <ChevronsUpDown size={14} className="text-faint" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="animate-scale-in absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-border bg-surface-elevated p-1 shadow-xl">
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setActiveOrgId(o.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/80 text-[9px] font-bold text-accent-foreground">
                  {initials(o.name)}
                </span>
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                <span className="text-[10px] uppercase text-faint">{o.role}</span>
                {o.id === org?.id && <Check size={14} className="text-accent" />}
              </button>
            ))}
            <div className="my-1 h-px bg-border-subtle" />
            <button
              onClick={() => {
                setOpen(false);
                onCreateOrg();
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted',
                'transition-colors hover:bg-surface-hover hover:text-foreground',
              )}
            >
              <Plus size={14} />
              New organization
            </button>
          </div>
        </>
      )}
    </div>
  );
}
