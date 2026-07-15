'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useAskTracer, type AskMessage } from '@/hooks/use-ask-tracer';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

const EXAMPLES = [
  'What are the open urgent issues?',
  'Summarize what changed this week',
  'Who has the most open work?',
  'Anything about authentication or login?',
];

export function AskTracerPanel() {
  const open = useUIStore((s) => s.askOpen);
  const setOpen = useUIStore((s) => s.setAskOpen);
  const { org } = useActiveOrg();
  const { messages, ask, isBusy, reset } = useAskTracer(org?.id);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3 || isBusy) return;
    void ask(trimmed);
    setInput('');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className="animate-slide-in-right fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
        role="dialog"
        aria-label="Ask Tracer"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles size={15} className="text-accent" />
            Ask Tracer
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={reset}
                disabled={isBusy}
                className="rounded px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-thin p-4">
          {messages.length === 0 ? (
            <div className="mt-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Sparkles size={18} />
              </div>
              <p className="text-sm font-medium">Ask about your issues</p>
              <p className="mx-auto mt-1 max-w-[260px] text-xs text-muted">
                Grounded in this organization&apos;s issues, comments, and activity. Answers cite
                the issues they came from.
              </p>
              <div className="mt-5 space-y-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => submit(ex)}
                    className="block w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-left text-xs text-muted transition-colors hover:border-border-subtle hover:text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <Turn key={m.id} message={m} onNavigate={() => setOpen(false)} />)
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="shrink-0 border-t border-border p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Ask a question…"
              className="max-h-32 min-h-[38px] flex-1 resize-none rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
            />
            <button
              type="submit"
              disabled={isBusy || input.trim().length < 3}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
            >
              {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="mt-1.5 px-0.5 text-[10px] text-faint">
            Tracer can be wrong — verify against the cited issues.
          </p>
        </form>
      </aside>
    </>
  );
}

function Turn({ message, onNavigate }: { message: AskMessage; onNavigate: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-br-sm bg-accent px-3 py-2 text-sm text-white">
          {message.question}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Sparkles size={13} />
        </div>
        <div className="min-w-0 flex-1">
          {message.status === 'working' && <PendingLine label="Searching your issues…" />}
          {message.status === 'retrying' && (
            <PendingLine label="Rate limited — auto-retrying, no action needed…" />
          )}
          {message.status === 'failed' && (
            <p className="text-sm text-priority-urgent">{message.error}</p>
          )}
          {message.status === 'completed' && (
            <>
              <p className="whitespace-pre-wrap text-sm text-foreground">{message.answer}</p>
              {message.citations && message.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.citations.map((c) => (
                    <Link
                      key={c.issueId}
                      href={`/app/projects/${c.projectId}?issue=${c.issueId}`}
                      onClick={onNavigate}
                      title={c.title}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-elevated px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:border-accent hover:text-foreground"
                    >
                      <span className="font-mono font-medium text-accent">{c.identifier}</span>
                      <span className="max-w-[140px] truncate">{c.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <Loader2 size={14} className={cn('animate-spin')} />
      {label}
    </div>
  );
}
