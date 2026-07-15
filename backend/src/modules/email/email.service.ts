import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../../config/env';
import { renderEmail } from './templates';
import type { EmailJobData } from '../../queues/queues';

/**
 * Email delivery with three tiers, in priority order:
 *   1. Resend  — when RESEND_API_KEY is set (preferred; simple HTTPS API).
 *   2. SMTP    — when SMTP_HOST/USER/PASS are set (e.g. Gmail app password).
 *   3. Dev log — otherwise the message is rendered and logged (no network I/O),
 *                so the queue → worker → render pipeline works fully offline.
 */

let resend: Resend | null = null;
function getResend(): Resend {
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

let transporterPromise: Promise<Transporter> | null = null;
async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;
  transporterPromise = (async () => {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: (env.SMTP_PORT ?? 587) === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
    }
    console.log('✉️  No email transport configured — emails are rendered and logged, not delivered.');
    return nodemailer.createTransport({ jsonTransport: true });
  })();
  return transporterPromise;
}

/** Renders and sends a templated email. Called by the email worker. */
export async function sendEmail(job: EmailJobData): Promise<void> {
  const { subject, html, text } = renderEmail(job.template, job.data);

  if (env.RESEND_API_KEY) {
    const { data, error } = await getResend().emails.send({
      from: env.EMAIL_FROM,
      to: job.to,
      subject,
      html,
      text,
    });
    // Surface Resend's error so the worker retries (and the reason is visible)
    // rather than silently swallowing a rejected send.
    if (error) throw new Error(`Resend: ${error.message}`);
    console.log(`✉️  Email sent via Resend: "${subject}" → ${job.to} (id ${data?.id})`);
    return;
  }

  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: env.EMAIL_FROM, to: job.to, subject, html, text });
  console.log(`✉️  Email sent: "${subject}" → ${job.to} (${job.template})`);
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log(`   preview: ${preview}`);
}
