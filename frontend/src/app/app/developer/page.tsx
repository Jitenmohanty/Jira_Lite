'use client';

import { useState } from 'react';
import { Copy, KeyRound, Plus, Send, Trash2, Webhook as WebhookIcon } from 'lucide-react';
import { useActiveOrg } from '@/hooks/use-active-org';
import {
  useApiKeys,
  useCreateApiKey,
  useCreateWebhook,
  useDeleteWebhook,
  useDeliveries,
  usePingWebhook,
  useRevokeApiKey,
  useWebhookEvents,
  useWebhooks,
  type WebhookDelivery,
} from '@/hooks/use-developer';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export default function DeveloperPage() {
  const { org } = useActiveOrg();
  const isAdmin = org?.role === 'owner' || org?.role === 'admin';

  return (
    <div className="mx-auto max-w-3xl space-y-10 p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Developer</h1>
        <p className="mt-0.5 text-sm text-muted">
          API keys for programmatic access and webhooks for event notifications.
        </p>
      </div>

      {!isAdmin ? (
        <EmptyState
          icon={<KeyRound size={20} />}
          title="Admins only"
          description="You need the admin or owner role to manage API keys and webhooks."
        />
      ) : org ? (
        <>
          <ApiKeysSection orgId={org.id} />
          <WebhooksSection orgId={org.id} />
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ API keys */

function ApiKeysSection({ orgId }: { orgId: string }) {
  const { data: keys, isLoading } = useApiKeys(orgId);
  const create = useCreateApiKey(orgId);
  const revoke = useRevokeApiKey(orgId);
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);

  const submit = async () => {
    if (name.trim().length < 1) return;
    const created = await create.mutateAsync({ name: name.trim() });
    setRevealed(created.key);
    setName('');
    setCreating(false);
  };

  return (
    <section>
      <SectionHeader
        icon={<KeyRound size={16} />}
        title="API keys"
        subtitle="Authenticate as this organization with Authorization: Bearer <key>."
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={15} /> New key
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : !keys || keys.length === 0 ? (
        <p className="rounded-lg border border-border px-4 py-6 text-center text-sm text-muted">
          No API keys yet.
        </p>
      ) : (
        <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {k.name}
                  {k.revokedAt && (
                    <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                      revoked
                    </span>
                  )}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {k.prefix}…{'  ·  '}
                  {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'never used'}
                </p>
              </div>
              {!k.revokedAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted hover:text-danger"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(k.id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Create API key">
        <div className="space-y-3">
          <Input
            placeholder="Key name (e.g. CI pipeline)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={create.isPending} onClick={() => void submit()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reveal-once modal */}
      <Modal open={!!revealed} onClose={() => setRevealed(null)} title="Copy your API key">
        <p className="mb-3 text-sm text-muted">
          This is the only time the key is shown. Store it somewhere safe.
        </p>
        <SecretBox value={revealed ?? ''} onCopy={() => toast({ title: 'Copied to clipboard', variant: 'success' })} />
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => setRevealed(null)}>
            Done
          </Button>
        </div>
      </Modal>
    </section>
  );
}

/* ------------------------------------------------------------------ webhooks */

function WebhooksSection({ orgId }: { orgId: string }) {
  const { data: webhooks, isLoading } = useWebhooks(orgId);
  const { data: events } = useWebhookEvents(orgId);
  const create = useCreateWebhook(orgId);
  const del = useDeleteWebhook(orgId);
  const ping = usePingWebhook(orgId);
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [openDeliveries, setOpenDeliveries] = useState<string | null>(null);

  const toggle = (ev: string) =>
    setSelected((s) => (s.includes(ev) ? s.filter((e) => e !== ev) : [...s, ev]));

  const submit = async () => {
    setError(null);
    const chosen = selected.length ? selected : (events ?? []);
    try {
      const created = await create.mutateAsync({ url: url.trim(), events: chosen });
      setSecret(created.secret);
      setUrl('');
      setSelected([]);
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create webhook');
    }
  };

  return (
    <section>
      <SectionHeader
        icon={<WebhookIcon size={16} />}
        title="Webhooks"
        subtitle="Receive HMAC-signed POSTs when issues and comments change."
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add webhook
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : !webhooks || webhooks.length === 0 ? (
        <p className="rounded-lg border border-border px-4 py-6 text-center text-sm text-muted">
          No webhooks yet.
        </p>
      ) : (
        <div className="space-y-2">
          {webhooks.map((w) => (
            <div key={w.id} className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">{w.url}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {w.events.length} event{w.events.length === 1 ? '' : 's'}
                    {'  ·  '}
                    <button
                      className="underline-offset-2 hover:underline"
                      onClick={() => setOpenDeliveries(openDeliveries === w.id ? null : w.id)}
                    >
                      {openDeliveries === w.id ? 'hide deliveries' : 'view deliveries'}
                    </button>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Send test event"
                    onClick={() =>
                      ping.mutate(w.id, {
                        onSuccess: () => toast({ title: 'Test event queued', variant: 'success' }),
                      })
                    }
                  >
                    <Send size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted hover:text-danger"
                    title="Delete webhook"
                    onClick={() => del.mutate(w.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              {openDeliveries === w.id && <Deliveries orgId={orgId} webhookId={w.id} />}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add webhook">
        <div className="space-y-3">
          <Input
            placeholder="https://example.com/webhooks/tracer"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Events (all if none selected)</p>
            <div className="flex flex-wrap gap-1.5">
              {(events ?? []).map((ev) => (
                <button
                  key={ev}
                  onClick={() => toggle(ev)}
                  className={cn(
                    'rounded-md border px-2 py-1 font-mono text-xs transition-colors',
                    selected.includes(ev)
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-muted hover:text-foreground',
                  )}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={create.isPending} disabled={!url.trim()} onClick={() => void submit()}>
              Add
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reveal-once secret */}
      <Modal open={!!secret} onClose={() => setSecret(null)} title="Webhook signing secret">
        <p className="mb-3 text-sm text-muted">
          Verify each delivery&apos;s <code className="text-xs">X-Tracer-Signature</code> with this
          secret. Shown only once.
        </p>
        <SecretBox value={secret ?? ''} onCopy={() => toast({ title: 'Copied to clipboard', variant: 'success' })} />
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => setSecret(null)}>
            Done
          </Button>
        </div>
      </Modal>
    </section>
  );
}

function Deliveries({ orgId, webhookId }: { orgId: string; webhookId: string }) {
  const { data, isLoading } = useDeliveries(orgId, webhookId);
  if (isLoading) return <div className="border-t border-border-subtle p-3"><Skeleton className="h-8 w-full" /></div>;
  if (!data || data.length === 0)
    return <p className="border-t border-border-subtle p-3 text-xs text-muted">No deliveries yet.</p>;
  return (
    <div className="border-t border-border-subtle">
      <table className="w-full text-xs">
        <tbody>
          {data.map((d: WebhookDelivery) => (
            <tr key={d.id} className="border-b border-border-subtle last:border-0">
              <td className="py-2 pl-4 font-mono text-muted">{d.event}</td>
              <td className="py-2">
                <StatusPill status={d.status} code={d.statusCode} />
              </td>
              <td className="py-2 pr-4 text-right text-faint">
                {d.attempts} attempt{d.attempts === 1 ? '' : 's'}
                {d.error ? ` · ${d.error}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status, code }: { status: string; code: number | null }) {
  const style =
    status === 'success'
      ? 'bg-success/15 text-success'
      : status === 'failed'
        ? 'bg-danger/15 text-danger'
        : 'bg-surface-hover text-muted';
  return (
    <span className={cn('rounded px-1.5 py-0.5 font-medium', style)}>
      {status}
      {code ? ` ${code}` : ''}
    </span>
  );
}

/* ------------------------------------------------------------------- shared */

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted">{icon}</span>
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function SecretBox({ value, onCopy }: { value: string; onCopy: () => void }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      onCopy();
    } catch {
      /* clipboard blocked — user can select manually */
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated p-2">
      <code className="min-w-0 flex-1 truncate font-mono text-xs">{value}</code>
      <Button variant="secondary" size="sm" onClick={copy}>
        <Copy size={13} /> Copy
      </Button>
    </div>
  );
}
