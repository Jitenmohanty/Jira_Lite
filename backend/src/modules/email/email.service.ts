import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { renderEmail } from './templates';
import type { EmailJobData } from '../../queues/queues';

let transporterPromise: Promise<Transporter> | null = null;

/**
 * Lazily builds the mail transport once. If SMTP is configured (e.g. Gmail),
 * uses it; otherwise in development it provisions a throwaway Ethereal test
 * inbox so emails are viewable via a preview URL — no real credentials needed.
 */
async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      // Real delivery (e.g. Gmail: smtp.gmail.com:465 with an app password).
      return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: (env.SMTP_PORT ?? 587) === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
    }
    // Dev fallback: JSON transport renders the message without any network I/O,
    // so the queue → worker → render pipeline works fully offline. Configure
    // SMTP_* in .env for real delivery.
    console.log('✉️  No SMTP configured — emails are rendered and logged, not delivered.');
    return nodemailer.createTransport({ jsonTransport: true });
  })();

  return transporterPromise;
}

/** Renders and sends a templated email. Called by the email worker. */
export async function sendEmail(job: EmailJobData): Promise<void> {
  const transporter = await getTransporter();
  const { subject, html, text } = renderEmail(job.template, job.data);
  const info = await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: job.to,
    subject,
    html,
    text,
  });
  console.log(`✉️  Email sent: "${subject}" → ${job.to} (${job.template})`);
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log(`   preview: ${preview}`);
}
