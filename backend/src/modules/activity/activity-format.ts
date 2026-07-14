type Meta = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** Human-readable one-liner for a digest email: "<Actor> <did something>". */
export function formatActivityLine(actor: string, action: string, meta: Meta): string {
  switch (action) {
    case 'org.created':
      return `${actor} created the organization`;
    case 'project.created':
      return `${actor} created project ${str(meta.name) ?? ''}`.trim();
    case 'project.updated':
      return `${actor} updated a project`;
    case 'project.deleted':
      return `${actor} deleted a project`;
    case 'issue.created':
      return `${actor} created an issue: ${str(meta.title) ?? ''}`.trim();
    case 'issue.status_changed':
      return `${actor} moved an issue ${str(meta.from) ?? ''} → ${str(meta.to) ?? ''}`.trim();
    case 'issue.updated':
      return `${actor} updated an issue`;
    case 'issue.deleted':
      return `${actor} deleted ${str(meta.identifier) ?? 'an issue'}`;
    case 'comment.created':
      return `${actor} left a comment`;
    case 'member.added':
      return `${actor} added a member`;
    case 'member.role_changed':
      return `${actor} changed a member's role`;
    default:
      return `${actor} — ${action}`;
  }
}
