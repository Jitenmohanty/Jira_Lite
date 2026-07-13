'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useProjects } from '@/hooks/use-projects';
import { useLogout } from '@/hooks/use-auth';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { org } = useActiveOrg();
  const { data: projects } = useProjects(org?.id);
  const logout = useLogout();
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const openCreateIssue = useUIStore((s) => s.openCreateIssue);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  // ⌘K / Ctrl+K toggles the palette anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const toLight = root.classList.contains('dark');
    root.classList.toggle('light', toLight);
    root.classList.toggle('dark', !toLight);
    try {
      localStorage.setItem('tracer-theme', toLight ? 'light' : 'dark');
    } catch {
      /* ignore */
    }
  };

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => {
      router.push(path);
      setOpen(false);
    };
    const list: Command[] = [
      { id: 'dashboard', label: 'Go to Dashboard', icon: <LayoutDashboard size={15} />, run: go('/app') },
      { id: 'activity', label: 'Go to Activity', icon: <Activity size={15} />, run: go('/app/activity') },
      { id: 'members', label: 'Go to Members', icon: <Users size={15} />, run: go('/app/members') },
      {
        id: 'new-issue',
        label: 'Create issue',
        hint: 'C',
        icon: <Plus size={15} />,
        run: () => {
          setOpen(false);
          openCreateIssue();
        },
      },
      { id: 'theme', label: 'Toggle theme', icon: <Moon size={15} />, run: () => toggleTheme() },
      {
        id: 'logout',
        label: 'Sign out',
        icon: <LogOut size={15} />,
        run: async () => {
          setOpen(false);
          await logout.mutateAsync();
          router.replace('/login');
        },
      },
    ];
    for (const p of projects ?? []) {
      list.push({
        id: `project-${p.id}`,
        label: `Go to ${p.name}`,
        hint: p.key,
        icon: <FolderKanban size={15} />,
        run: go(`/app/projects/${p.id}`),
      });
    }
    return list;
  }, [projects, router, setOpen, openCreateIssue, logout]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[active]?.run();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:pt-[15vh]">
      <div
        className="animate-fade-in fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-scale-in relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-3">
          <Search size={16} className="text-faint" />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search commands and projects…"
            className="h-11 w-full bg-transparent text-sm text-foreground placeholder:text-faint focus:outline-none"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto scrollbar-thin p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-faint">No results</p>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => c.run()}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors',
                i === active ? 'bg-surface-hover text-foreground' : 'text-muted',
              )}
            >
              <span className="text-faint">{c.icon}</span>
              <span className="flex-1">{c.label}</span>
              {c.hint && (
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-faint">
                  {c.hint}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
