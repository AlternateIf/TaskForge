import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export function createTransportOptions(): Record<string, unknown> {
  const host = env('SMTP_HOST', 'localhost');
  const port = Number.parseInt(env('SMTP_PORT', '1025'), 10);
  const user = env('SMTP_USER', '');
  const pass = env('SMTP_PASS', '');
  const secure = env('SMTP_SECURE', 'false') === 'true';
  const rejectUnauthorized = env('SMTP_TLS_REJECT_UNAUTHORIZED', 'true') !== 'false';

  const options: Record<string, unknown> = { host, port, secure };

  if (user) {
    options.auth = { user, pass };
  }

  if (!rejectUnauthorized) {
    options.tls = { rejectUnauthorized: false };
  }

  return options;
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(createTransportOptions());
  }
  return transporter;
}

export function resetTransporter(): void {
  transporter = null;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const from = env('EMAIL_FROM', 'TaskForge <noreply@taskforge.dev>');
  const transport = getTransporter();
  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
