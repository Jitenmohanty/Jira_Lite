import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Ambient accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[140px]"
      />

      <div className="animate-slide-up relative z-10 flex max-w-xl flex-col items-center text-center">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          Work in progress
        </div>

        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">Tracer</h1>

        <p className="mt-4 text-balance text-lg text-muted">
          A fast, keyboard-friendly issue tracker for modern teams. Plan work on a Kanban board,
          drag issues between states, and keep everyone in sync.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Create account
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-6 text-xs text-faint">
        Tracer · built with Next.js, Express &amp; PostgreSQL
      </footer>
    </main>
  );
}
