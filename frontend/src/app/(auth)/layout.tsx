import type { ReactNode } from 'react';
import Link from 'next/link';
import { GitPullRequest, Command, Sparkles } from 'lucide-react';

const highlights = [
  {
    icon: GitPullRequest,
    title: 'Issues that keep pace',
    desc: 'Board, backlog, and cycles that stay in sync as the work shifts.',
  },
  {
    icon: Command,
    title: 'Keyboard-first',
    desc: 'Every action is a shortcut away — built for speed, not clicking.',
  },
  {
    icon: Sparkles,
    title: 'Ask Tracer',
    desc: 'Semantic search and an assistant grounded in your workspace.',
  },
];

const Wordmark = ({ className }: { className?: string }) => (
  <Link href="/" className={className}>
    <span className="grid h-6 w-6 place-items-center rounded-md bg-accent shadow-lg shadow-accent/30">
      <span className="h-2 w-2 rounded-[2px] bg-accent-foreground" />
    </span>
    <span className="text-[15px] font-semibold tracking-tight">Tracer</span>
  </Link>
);

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel (desktop) ───────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden border-r border-border/60 bg-surface lg:flex lg:flex-col lg:justify-between lg:p-14">
        {/* layered ambient glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-[460px] w-[460px] rounded-full bg-accent/25 blur-[150px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-[420px] w-[420px] rounded-full bg-status-in-progress/10 blur-[150px]"
        />
        {/* faint dot grid, token-driven so it tracks the theme */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgb(var(--foreground)/0.05)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />

        <div className="relative z-10 flex items-center gap-2">
          <Wordmark className="flex items-center gap-2.5" />
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
            Track work the way{' '}
            <span className="bg-gradient-to-r from-accent to-status-in-progress bg-clip-text text-transparent">
              fast teams
            </span>{' '}
            do.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            The issue tracker for teams who move quickly and keep things tidy —
            planning, triage, and shipping in one dense, keyboard-driven surface.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-elevated text-accent">
                  <Icon size={17} strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs text-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            SOC-friendly auth
          </span>
          <span>Signed webhooks</span>
          <span>Scoped API keys</span>
        </div>
      </aside>

      {/* ── Form panel ──────────────────────────────────────────────────── */}
      <main className="relative flex items-center justify-center px-6 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[520px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/10 blur-[130px] lg:hidden"
        />
        <div className="relative z-10 w-full max-w-sm">
          <Wordmark className="mb-8 flex items-center justify-center gap-2 lg:hidden" />
          <div className="animate-scale-in rounded-xl border border-border/70 bg-surface/70 p-7 shadow-2xl shadow-black/20 backdrop-blur-xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
