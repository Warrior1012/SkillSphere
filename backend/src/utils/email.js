import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Sends an email, or logs it to the console if SMTP isn't configured.
 * Never throws on a missing SMTP config — a demo/dev environment without
 * real email credentials should still be able to complete the auth flow
 * (the "sent" link is simply printed to the server log instead).
 */
export async function sendEmail({ to, subject, html }) {
  const t = getTransporter();

  if (!t) {
    console.log('\n--- [dev email — SMTP not configured, printing instead] ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('--- [end dev email] ---\n');
    return { simulated: true };
  }

  return t.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}
