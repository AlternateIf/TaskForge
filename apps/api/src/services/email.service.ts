import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST ?? 'localhost';
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT ?? '1025', 10);
const SMTP_USER = process.env.SMTP_USER ?? '';
const SMTP_PASS = process.env.SMTP_PASS ?? '';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'TaskForge <noreply@taskforge.dev>';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
    });
  }
  return transporter;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transport = getTransporter();
  await transport.sendMail({
    from: EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
