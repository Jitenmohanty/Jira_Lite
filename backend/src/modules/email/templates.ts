import { env } from '../../config/env';
import type { EmailTemplate } from '../../queues/queues';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

/** Minimal, email-client-safe layout with inline styles. */
function layout(opts: { heading: string; body: string; cta?: { label: string; url: string } }): string {
  const button = opts.cta
    ? `<a href="${opts.cta.url}" style="display:inline-block;background:#5e6ad2;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">${opts.cta.label}</a>`
    : '';
  return `
  <div style="background:#f4f4f7;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #ececf1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
        <span style="display:inline-block;width:10px;height:10px;background:#5e6ad2;border-radius:3px"></span>
        <span style="font-size:16px;font-weight:700;color:#17191d">Tracer</span>
      </div>
      <h1 style="font-size:18px;color:#17191d;margin:0 0 12px">${opts.heading}</h1>
      <div style="font-size:14px;line-height:1.6;color:#4b5563">${opts.body}</div>
      ${button ? `<div style="margin-top:24px">${button}</div>` : ''}
      <p style="margin-top:28px;font-size:12px;color:#9ca3af">You're receiving this because you have a Tracer account.</p>
    </div>
  </div>`;
}

/** Renders a templated email to subject/html/text. */
export function renderEmail(template: EmailTemplate, data: Record<string, unknown>): RenderedEmail {
  switch (template) {
    case 'welcome': {
      const name = str(data.name, 'there');
      return {
        subject: 'Welcome to Tracer 👋',
        html: layout({
          heading: `Welcome, ${name}!`,
          body: `Thanks for signing up for Tracer. Create an organization, spin up a project, and start tracking work on the board.`,
          cta: { label: 'Open Tracer', url: env.APP_URL },
        }),
        text: `Welcome, ${name}! Thanks for signing up for Tracer. Open ${env.APP_URL} to get started.`,
      };
    }
    case 'verify-email': {
      const url = str(data.url);
      return {
        subject: 'Verify your email',
        html: layout({
          heading: 'Confirm your email address',
          body: `Please verify your email to secure your Tracer account. This link expires in 24 hours.`,
          cta: { label: 'Verify email', url },
        }),
        text: `Verify your email: ${url}`,
      };
    }
    case 'password-reset': {
      const url = str(data.url);
      return {
        subject: 'Reset your password',
        html: layout({
          heading: 'Reset your password',
          body: `We received a request to reset your password. This link expires in 1 hour. If you didn't request this, you can ignore this email.`,
          cta: { label: 'Reset password', url },
        }),
        text: `Reset your password: ${url}`,
      };
    }
    case 'issue-assigned': {
      const identifier = str(data.identifier);
      const title = str(data.title);
      const url = str(data.url);
      return {
        subject: `Assigned: ${identifier} ${title}`,
        html: layout({
          heading: `You were assigned ${identifier}`,
          body: `<strong>${title}</strong> was assigned to you.`,
          cta: { label: 'View issue', url },
        }),
        text: `You were assigned ${identifier}: ${title}. ${url}`,
      };
    }
    case 'activity-digest': {
      const orgName = str(data.orgName, 'your organization');
      const count = typeof data.count === 'number' ? data.count : 0;
      const items = Array.isArray(data.items) ? (data.items as string[]) : [];
      return {
        subject: `Your daily digest for ${orgName}`,
        html: layout({
          heading: `${count} update${count === 1 ? '' : 's'} in ${orgName}`,
          body: `<ul style="padding-left:18px;margin:0">${items
            .map((i) => `<li style="margin-bottom:6px">${i}</li>`)
            .join('')}</ul>`,
          cta: { label: 'Open Tracer', url: env.APP_URL },
        }),
        text: `${count} updates in ${orgName}:\n${items.join('\n')}`,
      };
    }
  }
}
