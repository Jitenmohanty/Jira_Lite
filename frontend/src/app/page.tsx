import Link from 'next/link';
import {
  ArrowRight,
  Command,
  GitPullRequest,
  LineChart,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: GitPullRequest,
    title: 'Board & backlog',
    desc: 'Drag issues across states with optimistic updates. Cycles, priorities, and labels included.',
  },
  {
    icon: Command,
    title: 'Keyboard-first',
    desc: 'A command palette and shortcuts for every action — navigate and edit without touching the mouse.',
  },
  {
    icon: Sparkles,
    title: 'Ask Tracer',
    desc: 'Semantic search and an AI assistant grounded in your workspace, with strict tenant isolation.',
  },
  {
    icon: LineChart,
    title: 'Insights',
    desc: 'Throughput, cycle time, and status breakdowns so you can see how work actually flows.',
  },
  {
    icon: Users,
    title: 'Teams & roles',
    desc: 'Organizations, projects, and role-based access enforced server-side — invite in seconds.',
  },
  {
    icon: ShieldCheck,
    title: 'Developer platform',
    desc: 'Scoped API keys and HMAC-signed webhooks to wire Tracer into the rest of your stack.',
  },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-accent shadow-lg shadow-accent/30">
        <span className="h-2 w-2 rounded-[2px] bg-accent-foreground" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Tracer</span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[540px] w-[820px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/20 blur-[150px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgb(var(--foreground)/0.04)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        {/* nav */}
        <header className="flex items-center justify-between py-6">
          <Wordmark />
          <nav className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Get started
              <ArrowRight size={15} />
            </Link>
          </nav>
        </header>

        {/* hero */}
        <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="animate-slide-up flex max-w-3xl flex-col items-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
              <Zap size={12} className="text-accent" />
              Fast, keyboard-friendly issue tracking
            </div>

            <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Track work the way{' '}
              <span className="bg-gradient-to-r from-accent to-status-in-progress bg-clip-text text-transparent">
                fast teams
              </span>{' '}
              do.
            </h1>

            <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-muted">
              Tracer is a dense, modern issue tracker — plan on a Kanban board, drag issues between
              states, and keep everyone in sync. Built for speed, not clicking.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-lg shadow-accent/25 transition-colors hover:bg-accent-hover"
              >
                Create your account
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Sign in
              </Link>
            </div>

            <p className="mt-4 text-xs text-faint">
              Try the demo · owner@tracer.dev · password123
            </p>
          </div>

          {/* feature grid */}
          <div className="mt-20 grid w-full gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-xl border border-border/70 bg-surface/50 p-5 backdrop-blur transition-colors hover:border-border hover:bg-surface"
              >
                <span className="mb-3 inline-grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-elevated text-accent transition-transform group-hover:-translate-y-0.5">
                  <Icon size={17} strokeWidth={2} />
                </span>
                <h3 className="text-sm font-medium text-foreground">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </main>

        {/* footer */}
        <footer className="flex flex-col items-center justify-between gap-3 border-t border-border-subtle py-6 text-xs text-faint sm:flex-row">
          <span>Tracer · built with Next.js, Express &amp; PostgreSQL</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Signed webhooks
            </span>
            <span>Scoped API keys</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
